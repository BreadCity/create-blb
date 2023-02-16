import prompts from 'prompts';
import Logger from '@exponentialworkload/logger';
import licenseContents from './licenses';
import { resolve } from 'path';
import { copySync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs-extra';
import { execSync } from 'child_process';
import {sync as commandExistsSync} from 'command-exists'
Logger.postGuillemet=true;
(async()=>{
  process.stdout.clearLine(0);
  const logger = new Logger()
  const response = await prompts([
    {
      name: 'projectname',
      type: 'text',
      message: 'What is your project named?',
      initial: 'ExampleProject',
    },
    {
      name: 'location',
      type: 'text',
      message: 'Where would you like your scaffold project to be created?',
      initial: last => process.cwd() + '/' + last.toLowerCase().replace(/ /gui,'-'),
    },
    {
      name: 'projectauthor',
      type: 'text',
      message: 'What is your project\'s author?',
      initial: process.env.USER??'',
      validate: v=>v?true:'This field is required.',
    },
    {
      name: 'license',
      type: 'autocompleteMultiselect',
      message: 'What license do you wish to use?',
      hint: '(multiple = user can select which one they wish to follow)',
      choices: [
        {
          title: 'MIT License (Suggested)',
          description: 'https://github.com/BreadCity/blb/blob/main/LICENSE | Permissive / What BLB is licensed under',
          value: 'MIT',
          selected: true,
        },
        {
          title: 'Unlicense (Public Domain)',
          description: 'https://spdx.org/licenses/Unlicense.html | Overly Permissive',
          value: 'Unlicense',
        },
        {
          title: 'Affero GPL-3.0 License',
          description: 'https://www.gnu.org/licenses/agpl-3.0.html | Strong Copyleft, Network Protective',
          value: 'AGPL-3.0-OR-LATER',
        },
        {
          title: 'GPL-3.0 License',
          description: 'https://www.gnu.org/licenses/agpl-3.0.html | Strong Copyleft',
          value: 'GPL-3.0-OR-LATER',
        },
        {
          title: 'Lesser GPL-3.0 License',
          description: 'https://www.gnu.org/licenses/gpl-3.0.html | Weak Copyleft',
          value: 'LGPL-3.0-OR-LATER'
        },
        {
          title: '--- Old GPL Variants ---',
          disabled: true,
          value: '--- Old GPL Variants ---'
        },
        {
          title: 'GPL-2.0 License',
          description: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.html | Weak Copyleft',
          value: 'LGPL-3.0-OR-LATER'
        },
        {
          title: 'Lesser GPL-2.0 License',
          description: 'https://www.gnu.org/licenses/old-licenses/lgpl-2.0.html | Weak Copyleft',
          value: 'LGPL-3.0-OR-LATER'
        }
      ],
    },
    {
      name: 'completed',
      type: 'confirm',
      message: 'Is the above information correct?',
      initial: 'y'
    }
  ])
  if (!response.completed) return logger.error('EABORT','Aborted.')
  const licenses = (response.license as string[])
  if (licenses.filter(v=>v.toString().includes('---')).length>0)
    return logger.error('ELICENSE','Includes Header Field(s): '+licenses.filter(v=>v.includes('---')).join(','))
  if (licenses.length === 0)
    licenses.push('UNLICENSED')
  const outdir = resolve(response.location);
  const name = response.projectname;
  const author = response.projectauthor;
  const templateFiles = resolve(__dirname,'..','templateFiles')
  if (existsSync(outdir)) {
    if (readdirSync(outdir).length > 0) {
      const option = (await prompts({
        name: 'confirmation',
        type: 'select',
        message: 'The output directory already exists & is not empty. What action do you wish to take?',
        choices: [
          {
            title: 'Abort',
            value: false
          },
          {
            title: 'Overwrite',
            value: 'overwrite'
          },
          {
            title: 'Clear',
            value: 'clear'
          }
        ]
      })).confirmation
      switch (option) {
        case 'clear':
          rmSync(outdir,{
            recursive: true,
            force: true,
          })
          break;
        case 'overwrite':
          break;
      
        default:
          return logger.error('EABORT','Aborted.')
      }
    }
  }
  if (!existsSync(outdir))
    mkdirSync(outdir);
  logger.info('Copying Template')
  copySync(templateFiles,outdir)
  logger.info('Overwriting package.json')
  const templatePackageJSON = JSON.parse(readFileSync(resolve(templateFiles,'package.json'),'utf-8'));
  templatePackageJSON.license = licenses.join(' OR ');
  templatePackageJSON.name = name.toLowerCase();
  templatePackageJSON.displayName = name;
  templatePackageJSON.author = author;
  writeFileSync(resolve(outdir,'package.json'),JSON.stringify(templatePackageJSON,null,2))
  if (licenses.length === 1 && licenseContents[licenses[0]]) {
    logger.info('Writing to License')
    const license = licenseContents[licenses[0]].replace(/<program>/gui,name).replace(/<year>/gui,new Date().getFullYear().toString()).replace(/<name of author>/gui,author)
    writeFileSync(resolve(outdir,'LICENSE.md'),license)
  } else 
    logger.warn('>1 License, not writing to License.md')
  logger.info('Installing Dependencies')
  let packageManager:string;
  if (commandExistsSync('pnpm')) packageManager='pnpm'
  else if (commandExistsSync('yarn')) packageManager='yarn'
  else if (commandExistsSync('npm')) packageManager='npm'
  else {
    logger.error('ENOPM','Cannot find package manager! Please install pnpm @ https://pnpm.io')
    return;
  }
  const packageManagerInstall = `${packageManager} ${packageManager==='yarn'?'add':'i'}`
  execSync(packageManagerInstall,{
    cwd: outdir
  })
  logger.success('Done!')
})()