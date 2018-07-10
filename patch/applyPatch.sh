#!/bin/bash
echo -e '\033[0;36mStart applying the patch...\033[0m'
echo -e '\033[0;34mPatching SheetJS...\033[0m'
rm -rf ../node_modules/xlsx
cp -R ./xlsx ../node_modules
echo -e '\033[0;32mDone.\033[0m'
