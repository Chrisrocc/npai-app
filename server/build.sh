#!/bin/bash
echo "Installing Node.js dependencies..."
npm install
echo "Installing Python dependencies..."
pip install -r requirements.txt
echo "Build complete!"