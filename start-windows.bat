@echo off
echo ========================================================
echo Starting MODEL MANAGER Server with Gemini AI Mind Map
echo ========================================================
if "%GEMINI_API_KEY%"=="" (
  echo Notice: GEMINI_API_KEY environment variable is not set in this shell.
  echo The server will automatically load GEMINI_API_KEY from the .env file.
)
npm run dev
