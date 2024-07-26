# Overview

This repository assist in packing npm dependencies into a single folder

# Usage

1. Run `npm ls --omit dev` and uninstall any dependencies you don't need
2. Run `npm install` to install the dependencies you require
3. Run `npm run start` to pack the dependencies into the `packed` folder. Packed dependencies will be in `.tgz` format
