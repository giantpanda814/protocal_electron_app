'use strict';

process.env.NODE_ENV = 'production';

const { say } = require('cfonts');
const chalk = require('chalk');
const del = require('del');
const { spawn } = require('child_process');
const webpack = require('webpack');
const Multispinner = require('multispinner');

const mainConfig = require('./webpack.main.config');
const rendererConfig = require('./webpack.renderer.config');
const webConfig = require('./webpack.web.config');

const doneLog = chalk.bgGreen.white(' DONE ') + ' ';
const errorLog = chalk.bgRed.white(' ERROR ') + ' ';
const okayLog = chalk.bgBlue.white(' OKAY ') + ' ';
const isCI = process.env.CI || false;

if (process.env.BUILD_TARGET === 'clean') clean();
else if (process.env.BUILD_TARGET === 'web') web();
else build();

function clean() {
  del.sync([
    'build/*',
    '!build/icons',
    '!build/icon.*',
    '!build/background.png'
  ]);
  console.log(`\n${doneLog}\n`);
  process.exit();
}

function build() {
  greeting();

  del.sync(['dist/electron/*', '!.gitkeep']);

  const tasks = ['main', 'renderer'];
  const m = new Multispinner(tasks, {
    preText: 'building',
    postText: 'process'
  });

  let results = '';

  m.on('success', () => {
    process.stdout.write('\x1B[2J\x1B[0f');
    console.log(`\n\n${results}`);
    console.log(
      `${okayLog}take it away ${chalk.yellow('`electron-builder`')}\n`
    );
    process.exit();
  });

  pack(mainConfig)
    .then(result => {
      results += result + '\n\n';
      m.success('main');
    })
    .catch(err => {
      m.error('main');
      console.log(`\n  ${errorLog}failed to build main process`);
      console.error(`\n${err}\n`);
      process.exit(1);
    });

  pack(rendererConfig)
    .then(result => {
      results += result + '\n\n';
      m.success('renderer');
    })
    .catch(err => {
      m.error('renderer');
      console.log(`\n  ${errorLog}failed to build renderer process`);
      console.error(`\n${err}\n`);
      process.exit(1);
    });
}

function pack(config) {
  return new Promise((resolve, reject) => {
    config.mode = 'production';
    webpack(config, (err, stats) => {
      if (err) reject(err.stack || err);
      else if (stats.hasErrors()) {
        let err = '';

        stats
          .toString({
            chunks: false,
            colors: true
          })
          .split(/\r?\n/)
          .forEach(line => {
            err += `    ${line}\n`;
          });

        reject(err);
      } else {
        resolve(
          stats.toString({
            chunks: false,
            colors: true
          })
        );
      }
    });
  });
}

function web() {
  del.sync(['dist/web/*', '!.gitkeep']);
  webConfig.mode = 'production';
  webpack(webConfig, (err, stats) => {
    if (err || stats.hasErrors()) console.log(err);

    console.log(
      stats.toString({
        chunks: false,
        colors: true
      })
    );

    process.exit();
  });
}

function greeting() {
  const cols = process.stdout.columns;
  let text = '';

  if (cols > 104) text = 'Custom-Protocol-Dev-Build ';
  else if (cols > 76) text = 'Custom-Protocol-|Dev-|Build';
  else text = false;

  if (text) {
    say(text, {
      align: 'left',
      colors: ['Red', 'blueBright'],
      font: 'block',
      space: false
    });
  } else console.log(chalk.red.bold('Custom-Protocol-Dev'));

  console.log(
    chalk.blue(
      '\n                         Money won is twice as sweet as money earned ;)'
    ) + '\n'
  );

  console.log(
    chalk.blue(
      '                                     .-------.    ______\n' +
        '                                    /   o   /|   /\\     \\\n' +
        '                                   /_______/o|  /o \\  o  \\\n' +
        '                                   | o     | | /   o\\_____\\\n' +
        '                                   |   o   |o/ \\o   /o    /\n' +
        '                                   |     o |/   \\ o/  o  /\n' +
        "                                   '-------'     \\/____o/"
    )
  );
}
