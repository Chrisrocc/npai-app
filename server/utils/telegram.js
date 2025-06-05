const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chalk = require('chalk');
const { updateDatabaseFromPipeline } = require('../services/databaseUpdate');
const telegramLogger = require('../telegramLogger');

let messageBatch = [];
let mediaGroups = new Map();
let batchTimeout = null;
const BATCH_WINDOW = 5 * 1000;
const processedUpdates = new Set();
const processedPhotoPaths = new Set();

const downloadTelegramPhoto = async (fileId) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `photo_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, filename);

    const fileResponse = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = fileResponse.data;
    if (!fileData.ok) {
      throw new Error('Failed to get file path from Telegram');
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;

    const response = await axios({
      url: fileUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', (err) => {
        telegramLogger(`Error downloading photo: ${err.message}`, 'error');
        reject(err);
      });
    });
  } catch (err) {
    telegramLogger(`Error in downloadTelegramPhoto: ${err.message}`, 'error');
    throw err;
  }
};

const extractRegoFromPhotoAnalysis = (photoAnalysis) => {
  const regoMatch = photoAnalysis.match(/rego\s+([A-Za-z0-9-]+)/);
  return regoMatch ? regoMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '') : null;
};

const analyzePhoto = async (photoPath) => {
  try {
    const pyScript = path.join(__dirname, '../npai.py');
    const args = [pyScript, '--photo-only', photoPath];
    const pythonProcess = spawn('python', args);

    let output = '';
    await new Promise((resolve) => {
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      pythonProcess.stderr.on('data', (errData) => {
        const errStr = errData.toString();
        if (errStr.includes('Raw input received') || errStr.includes('Photo analysis result')) {
          telegramLogger(`Python debug: ${errStr.trim()}`, 'filter');
        } else {
          telegramLogger(`Python error: ${errStr.trim()}`, 'error');
        }
      });
      pythonProcess.on('close', () => resolve());
    });

    const result = JSON.parse(output);
    return result.photo_analysis || 'Photo Analysis: Car';
  } catch (e) {
    telegramLogger(`Error parsing photo analysis output: ${e.message}`, 'error');
    return 'Photo Analysis: Car';
  }
};

const processBatch = async (batch, chatId, isPlan = false) => {
  const finalMessages = [];
  let lastSender = 'Unknown';
  const photoRegos = [];

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const sender = item.sender || lastSender;
    lastSender = sender;

    let category = 'General';
    let list = 'No entities';

    try {
      if (item.type === 'photo') {
        category = 'Photo';
        const description = await analyzePhoto(item.path);
        const photoRego = extractRegoFromPhotoAnalysis(description);
        if (photoRego) {
          photoRegos.push(photoRego);
        }
        const photoLines = description.split('\n').filter(line => line.trim());
        list = photoLines.length > 0 ? photoLines.join(', ') : 'No description';
        photoLines.forEach(line => {
          const messageText = `[PHOTO] ${sender}: ${line}`;
          finalMessages.push({ text: messageText, isFromPhoto: true, category, list });
        });
        processedPhotoPaths.add(item.path);
        // Check for a caption immediately following the photo
        if (i + 1 < batch.length && batch[i + 1].type === 'text' && batch[i + 1].isCaption) {
          category = 'Caption';
          const caption = batch[i + 1].content;
          const captionLines = caption.split('\n').filter(line => line.trim());
          list = captionLines.length > 0 ? captionLines.join(', ') : 'No caption';
          captionLines.forEach(line => {
            const messageText = `${sender}: ${line}`;
            finalMessages.push({ text: messageText, isFromPhoto: false, category, list });
          });
          i++; // Skip the caption entry
        }
      } else if (item.type === 'text' && !item.isCaption) {
        if (item.content.startsWith('/')) {
          category = 'Command';
        }
        const lines = item.content.split('\n').filter(line => line.trim());
        list = lines.length > 0 ? lines.join(', ') : 'No text';
        lines.forEach(line => {
          const messageText = `${sender}: ${line}`;
          finalMessages.push({ text: messageText, isFromPhoto: false, category, list });
        });
      }
    } catch (err) {
      telegramLogger(`Error processing batch item: ${err.message}`, 'error');
    }
  }

  finalMessages.forEach(msg => {
    telegramLogger(`- ${msg.text}`, 'new_message', isPlan ? 'Plan' : msg.isFromPhoto ? 'Photo' : 'General', msg.list);
  });

  const pyScript = path.join(__dirname, '../npai.py');
  const pythonProcess = spawn('python', [pyScript, finalMessages.map(msg => msg.text).join('\n\n')]);

  let output = '';
  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (errData) => {
    const errStr = errData.toString();
    if (errStr.includes('Raw input received') || errStr.includes('Photo analysis result') || errStr.includes('Prompt') || errStr.includes('Processing line') || errStr.includes('Photo messages to compare')) {
      telegramLogger(`Python debug: ${errStr.trim()}`, 'filter');
    } else {
      telegramLogger(`Python error: ${errStr.trim()}`, 'error');
    }
  });

  pythonProcess.on('close', async (code) => {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in npai.py output');
      }
      const result = JSON.parse(jsonMatch[0]);

      result.photoRegos = photoRegos;
      result.isPlan = isPlan;

      await updateDatabaseFromPipeline(result);

      setTimeout(() => {
        batch.forEach(item => {
          if (item.type === 'photo' && processedPhotoPaths.has(item.path) && fs.existsSync(item.path)) {
            fs.unlink(item.path, (err) => {
              if (err) telegramLogger(`Error deleting photo: ${err.message}`, 'error');
              processedPhotoPaths.delete(item.path);
            });
          }
        });
      }, 30000);
    } catch (e) {
      telegramLogger(`Error parsing npai.py output: ${e.message}`, 'error');
    }
    messageBatch = [];
    mediaGroups.clear();
    batchTimeout = null;
    telegramLogger('', 'spacer');
    telegramLogger('', 'spacer');
  });
};

const telegramWebhook = async (req, res) => {
  try {
    if (req.body.message) {
      const updateId = req.body.update_id;
      if (processedUpdates.has(updateId)) {
        telegramLogger(`Skipping duplicate update_id: ${updateId}`, 'info');
        return res.status(200).send('OK');
      }
      processedUpdates.add(updateId);

      const message = req.body.message;
      const chatId = message.chat.id;
      const sender = message.from.first_name || message.from.username || 'Unknown';
      const receivedTime = new Date(message.date * 1000);
      const messageText = message.text || (message.caption ? message.caption : '');

      const mediaGroupId = message.media_group_id;

      if (messageText && /^plan\s/i.test(messageText) && !/^planning\s/i.test(messageText.toLowerCase())) {
        const batch = [];
        if (message.photo) {
          const fileId = message.photo[message.photo.length - 1].file_id;
          const photoPath = await downloadTelegramPhoto(fileId);
          batch.push({ type: 'photo', path: photoPath, chatId, sender });
          if (message.caption) {
            batch.push({ type: 'text', content: message.caption, isCaption: true, sender });
          }
        } else if (message.text) {
          batch.push({ type: 'text', content: message.text, isCaption: false, sender });
        }
        await processBatch(batch, chatId, true);
      } else {
        if (message.photo) {
          const fileId = message.photo[message.photo.length - 1].file_id;
          const photoPath = await downloadTelegramPhoto(fileId);
          if (mediaGroupId) {
            if (!mediaGroups.has(mediaGroupId)) {
              mediaGroups.set(mediaGroupId, []);
            }
            mediaGroups.get(mediaGroupId).push({ type: 'photo', path: photoPath, chatId, sender });
            if (message.caption) {
              mediaGroups.get(mediaGroupId).push({ type: 'text', content: message.caption, isCaption: true, sender });
            }
            if (batchTimeout) {
              clearTimeout(batchTimeout);
            }
            batchTimeout = setTimeout(() => {
              const mediaGroupBatch = [];
              mediaGroups.forEach((group, groupId) => {
                mediaGroupBatch.push(...group);
              });
              // Include messageBatch to capture any text messages that arrived during the delay
              processBatch([...messageBatch, ...mediaGroupBatch], chatId);
            }, 5000); // Increased to 5 seconds to capture subsequent text messages
          } else {
            messageBatch.push({ type: 'photo', path: photoPath, chatId, sender });
            if (message.caption) {
              messageBatch.push({ type: 'text', content: message.caption, isCaption: true, sender });
            }
            if (batchTimeout) {
              clearTimeout(batchTimeout);
            }
            batchTimeout = setTimeout(() => processBatch(messageBatch, chatId), BATCH_WINDOW);
          }
        } else if (message.text) {
          messageBatch.push({ type: 'text', content: message.text, isCaption: false, sender });
          // If a media group is pending, extend the timeout to include this text message
          if (mediaGroups.size > 0) {
            if (batchTimeout) {
              clearTimeout(batchTimeout);
            }
            batchTimeout = setTimeout(() => {
              const mediaGroupBatch = [];
              mediaGroups.forEach((group, groupId) => {
                mediaGroupBatch.push(...group);
              });
              processBatch([...messageBatch, ...mediaGroupBatch], chatId);
            }, 5000);
          } else {
            if (batchTimeout) {
              clearTimeout(batchTimeout);
            }
            batchTimeout = setTimeout(() => processBatch(messageBatch, chatId), BATCH_WINDOW);
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    telegramLogger(`Error: ${err.message}`, 'error');
    res.status(500).send('Error');
  }
};

module.exports = { telegramWebhook };