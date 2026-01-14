npm run build
rm -rf /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io/src/internal/eht/*
cp -r dist/* /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io/src/internal/eht/

cd /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io
git add src/internal/eht
git commit -m "Update EHT webpage"
git push origin main