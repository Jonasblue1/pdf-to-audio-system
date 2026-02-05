echo Cleaning project...
rmdir /s /q node_modules
del package-lock.json
rmdir /s /q .next

echo Installing dependencies...
npm install

echo Installing required packages...
npm install pdfjs-dist lamejs

echo Installing types...
npm install -D typescript @types/node

echo Creating lamejs types...
mkdir types 2>nul
echo declare module 'lamejs'; > types\lamejs.d.ts

echo Cleaning cache...
npm cache clean --force

echo Testing build...
npm run build

echo Done. Ready for Vercel.
pause
