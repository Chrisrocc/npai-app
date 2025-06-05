const express = require('express');
const router = express.Router();
const Task = require('../models/Tasks'); // Updated to match file name (Tasks.js)

// Get all tasks with populated car details
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().populate('carItems.car');
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const task = new Task({
      name: req.body.name,
      dayTime: req.body.dayTime,
      carItems: (req.body.carItems || []).map(item => ({
        car: item.car || null,
        carDetails: item.carDetails || {},
        comment: item.comment || ''
      })),
      dateCreated: req.body.dateCreated || Date.now()
    });

    const newTask = await task.save();
    const populatedTask = await Task.findById(newTask._id).populate('carItems.car');
    res.status(201).json(populatedTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(400).json({ message: 'Failed to create task', error: err.message });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.body.name !== undefined) task.name = req.body.name;
    if (req.body.dayTime !== undefined) task.dayTime = req.body.dayTime;
    if (req.body.carItems !== undefined) {
      task.carItems = req.body.carItems.map(item => ({
        car: item.car || null,
        carDetails: item.carDetails || {},
        comment: item.comment || ''
      }));
    }

    const updatedTask = await task.save();
    const populatedTask = await Task.findById(updatedTask._id).populate('carItems.car');
    res.json(populatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(400).json({ message: 'Failed to update task', error: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;