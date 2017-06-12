#!/usr/bin/env node

'use strict';

let googleSpreadsheet = require('google-spreadsheet');
let path = require('path');
var fs = require('fs-extra');
var argv = require('yargs').argv;

let options = {
    keyfile: argv.keyfile,
    spreadsheetId: argv.spreadsheetId,
    worksheetTitle: argv.worksheetTitle,
    dest: argv.dest
};

let spreadsheet = new googleSpreadsheet(options.spreadsheetId);
let creds = require(process.cwd() + '/' + options.keyfile);

// Clean up previous trads
fs.remove(options.dest);

login(spreadsheet, creds);

function login(spreadsheet, creds) {
    spreadsheet.useServiceAccountAuth(creds, (err) => {
        getWorksheet(spreadsheet);
    });
}

function getWorksheet(spreadsheet) {
    spreadsheet.getInfo((err, sheet_info) => {
        let worksheet = spreadsheet.worksheets.find((worksheet) => {
            return worksheet.title === options.worksheetTitle;
        });
        extractTranslationsAndWriteFile(worksheet);
    });
}

function extractTranslationsAndWriteFile(worksheet) {
    extractLangs(worksheet, (langs) => {
        extractTranslation(worksheet, langs, (translations) => {
            langs.forEach((lang) => {
                if (translations.hasOwnProperty(lang)) {
                    writeFile(translations[ lang ], options.dest + '/locale-' + lang + '.json');
                }
            });
        });
    });
}

function extractLangs(worksheet, callback) {
    worksheet.getCells({
        'min-row': 1,
        'max-row': 1,
        'min-col': 2
    }, (err, cells) => {
        callback(cells.map((cell) => {
            return cell.value;
        }).filter((cellValue) => {
            // Only take column with lang title (2 letters). Regional language not supported
            return cellValue.length === 2;
        }));
    });
}

function extractTranslation(worksheet, langs, callback) {
    let translations = {};
    langs.forEach((lang) => {
        translations[ lang ] = {};
    });

    worksheet.getRows({}, (err, rows) => {
        rows.forEach((row) => {
            langs.forEach((lang) => {
                translations[ lang ][ row.key ] = row[ lang ];
            });
        });
        callback(translations);
    });
}

function writeFile(translations, src) {
    let data = JSON.stringify(translations, null, 4);
    src = src.replace('//', '/');

    ensureDirectoryExistence(src);

    fs.writeFile(src, data, (err) => {
        if (err) {
            console.error('Something went wrong while writing file : ', err);
        } else {
            console.info('Generated file', src);
        }
    });
}

function ensureDirectoryExistence(filePath) {
    let dirname = path.dirname(filePath);

    if (fs.existsSync(dirname)) {
        return true;
    }

    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}