npm run build
cp -r dist/assets /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io/src/
cp -r dist/index.html /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io/src/internal/eht/index.html

cd /Users/SteffenPlunder/Documents/Workspace/steffenpl.github.io 
git add src/assets src/internal/eht/index.html
git commit -m "Update EHT webpage" src/assets src/internal/eht/index.html
git push origin main