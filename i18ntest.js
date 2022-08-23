const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const src = path.resolve(__dirname, 'src');
const fileRes = [];
const localeRes = [];

const getAllFiles = (_path = path.resolve(__dirname, 'src'), res = [], localeRes = []) => {
  const files = fs.readdirSync(_path);
  files.forEach((item, index) => {
    const fullPath = path.join(_path, item);
    const stat = fs.statSync(fullPath);
    if (!/locales/.test(fullPath)) {
      if (stat.isDirectory()) {
        getAllFiles(fullPath, res, localeRes);
      } else if (/\.js|\.ts|\.tsx$/.test(fullPath)) {
        res.push(fullPath.slice(fullPath.search('src')));
      }
    } else {
      if (stat.isDirectory()) {
        getAllFiles(fullPath, res, localeRes);
      } else if (/\.js|\.ts|\.tsx$/.test(fullPath)) {
        localeRes.push(fullPath.slice(fullPath.search('src')));
      }
    }
  });
  return [res, localeRes];
};
const localeContainer = {
  'zh-CN': [],
  'en-US': []
};
const validateLocale = () => {
  localeRes.forEach(item => {
    const data = fs.readFileSync(item, 'utf-8');
    localeContainer[item] = [];
    const extractReg = /(\w+)?:\s+{[\s\S]+?\s+}/ig;
    const arr = data.match(extractReg) || [];
    for (let i = 0; i < arr.length; i++) {
      const data = arr[i].match(/(\w+)(?=:)/ig) || [];
      localeContainer[item].push(...data.slice(1).map(value => `${data[0]}.${value}`));
    }

    if (/zh\-CN/.test(item)) {
      localeContainer['zh-CN'].push(...localeContainer[item]);
    } else {
      localeContainer['en-US'].push(...localeContainer[item]);
    }

    const emptyValueReg = /\w+:\s*(''|"")/img;
    const emptyValueArr = data.match(emptyValueReg) || [];
    if (emptyValueArr.length) {
      console.error(`${item}文件存在${emptyValueArr.join(',\n')}为空值`);
    }

    const zhCNReg = /(\w+):\s*(['"])\p{sc=Han}+\2/imgu;
    if (/en\-US/.test(item)) {
      const zhCNValueArr = data.match(zhCNReg) || [];
      if (zhCNValueArr.length) {
        console.error(chalk.red(`${item}文件存在${zhCNValueArr.join(',\n')}为中文`));
      }
    }
  });
};

const fileContainer = {};
const validateFile = () => {
  fileRes.forEach(item => {
    const data = fs.readFileSync(item, 'utf-8');
    fileContainer[item] = [];
    const extractmsgReg = /msg\((['"])(.+?)\1[,\)]/g;
    const arr = [...data.matchAll(extractmsgReg)];
    if (arr.length) {
      arr.forEach((v) => {
        fileContainer[item].push(v[2]);
      });
    }
    const extractlocaleTextReg = /(?:const|let|var)\s+(\w+)[^;]+?msg\(`(.+?)\..+?`[,\)]/g;
    const extractKeyArr = [...data.matchAll(extractlocaleTextReg)];
    if (extractKeyArr.length) {
      const fun = extractKeyArr[0][1];
      const key = extractKeyArr[0][2];
      const valueArrReg = new RegExp(`${fun}\\((['"])(.+?)\\1\\)`, 'g');
      const extractValueArr = [...data.matchAll(valueArrReg)];
      if (extractValueArr.length) {
        extractValueArr.forEach((v) => {
          fileContainer[item].push(`${key}.${v[2]}`);
        });
      }
    }
  });
};

getAllFiles(src, fileRes, localeRes);
validateLocale();
validateFile();
const arr = Object.entries(fileContainer);
for (let i = 0; i < arr.length; i++) {
  const eleCN = arr[i][1].find(item => !localeContainer['zh-CN'].includes(item));
  if (eleCN) {
    console.log(chalk.red(`${arr[i][0]}文件中的${eleCN}未中文国际化`, '\n\n'));
  }
  const eleUS = arr[i][1].find(item => !localeContainer['en-US'].includes(item));
  if (eleUS) {
    console.error(`${arr[i][0]}文件中的${eleUS}未英文国际化`);
  }
}

const fileAll = arr.map(value => value[1]).flat();
const uselessCN = localeContainer['zh-CN'].filter(item => !fileAll.includes(item));
if (uselessCN.length) {
  // console.log(`中文国际化文件存在${uselessCN.join(",")}等字段未使用`)
}


const uselessUS = localeContainer['en-US'].filter(item => !fileAll.includes(item));
if (uselessUS.length) {
  // console.log(`英文国际化文件存在${uselessUS.join(",")}等字段未使用`)
}
