import {copyFile,constants} from 'node:fs/promises';

// A fresh checkout already contains the last published routing catalogue.
// CI may have prepared a newer snapshot before building the console.
try {
  await copyFile(new URL('../../.github/pages-baseline/locations.json',import.meta.url),
    new URL('../../data/locations.json',import.meta.url),constants.COPYFILE_EXCL);
} catch(error) {
  if(error.code!=='EEXIST')throw error;
}
