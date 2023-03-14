import prompts from 'prompts';
import Logger from '@exponentialworkload/logger';
import licenseContents from './licenses';
import { resolve } from 'path';
import { copySync, ensureDirSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs-extra';
import { execSync } from 'child_process';
import {sync as commandExistsSync} from 'command-exists'
import chalk from 'chalk';
Logger.postGuillemet=true;
try {
  const ourPackage = JSON.parse(readFileSync(__dirname+'/../package.json','utf-8'))
  console.clear()
  console.log('');
  console.log(chalk.grey(`${ourPackage.name} version ${ourPackage.version}`));
  console.log('');
  console.log(chalk.rgb(0xff,0x77,0xff).bold(`  Welcome to ${ourPackage.displayName??ourPackage.name}`));
  console.log('');
} catch (error) {
  console.warn('Error obtaining package info:',error);
}
const mappings = {
  'barebones': 'Barebones Application',
  'demo': 'Demo',
} as Record<string,string>;
(async()=>{
  const logger = new Logger()
  const baseTemplateFiles = resolve(__dirname,'..','templateFiles')
  const templates = readdirSync(baseTemplateFiles).filter(v=>v!=='all').map(v=>({
    title: mappings[v]??v,
    value: v,
  }))
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
      name: 'template',
      type: 'select',
      choices: templates.map(v=>(v.value==='demo'?{
        title: v.title,
        value: v.value,
        selected: true,
      }:v)),
      message: 'Which template would you like to use?',
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
  if (existsSync(outdir)) {
    if (readdirSync(outdir).length > 0) {
      const option = (await prompts({
        name: 'confirmation',
        type: 'select',
        message: 'The output directory already exists & is not empty. What action do you wish to take?',
        choices: [
          {
            title: 'Abort',
            value: false,
          },
          {
            title: 'Clear',
            value: 'clear'
          },
          {
            title: 'Overwrite',
            value: 'overwrite'
          },
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
    ensureDirSync(outdir);
  logger.info('Copying Template')
  copySync(resolve(baseTemplateFiles,'all'),outdir)
  copySync(resolve(baseTemplateFiles,response.template),outdir)
  logger.info('Overwriting package.json')
  const templatePackageJSON = JSON.parse(readFileSync(resolve(outdir,'package.json'),'utf-8'));
  templatePackageJSON.license = licenses.join(' OR ');
  templatePackageJSON.name = name.toLowerCase();
  templatePackageJSON.displayName = name;
  templatePackageJSON.author = author;
  writeFileSync(resolve(outdir,'package.json'),JSON.stringify(templatePackageJSON,null,2))
  let template = (a:string)=>a.replace(/<program>/gui,name).replace(/<year>/gui,new Date().getFullYear().toString()).replace(/<name of author>/gui,author).replace(/<license name>/gui,licenses.join(', '))
  if (licenses.length === 1 && licenseContents[licenses[0]]) {
    logger.info('Writing to License')
    const license = template(licenseContents[licenses[0]])
    writeFileSync(resolve(outdir,'LICENSE.md'),license)
  } else 
    logger.warn('WNOLICENSEMD','>1 License, not writing to License.md')
  logger.info('Fetching Package Manager')
  let packageManager:string;
  if (commandExistsSync('pnpm')) packageManager='pnpm'
  else if (commandExistsSync('yarn')) packageManager='yarn'
  else if (commandExistsSync('npm')) packageManager='npm'
  else {
    logger.error('ENOPM','Cannot find package manager! Please install pnpm @ https://pnpm.io')
    return;
  }
  const readme = resolve(outdir,'README.md');
  const packageManagerInstall = `${packageManager} ${packageManager==='yarn'?'add':'i'}`
  const packageManagerRun = `${packageManager}${packageManager==='npm'?' run':''}`
  const oldTemplate = template
  template=(a:string)=>oldTemplate(a).replace(/<package manager>/gui,packageManager).replace(/<package manager install>/gui,packageManagerInstall).replace(/<package manager run>/gui,packageManagerRun)
  if (existsSync(readme)) {
    logger.info('Writing Readme')
    writeFileSync(readme,template(readFileSync(readme,'utf-8')))
  }
  if (existsSync(resolve(outdir,'gitignore')))
    renameSync(resolve(outdir,'gitignore'),resolve(outdir,'.gitignore'))
  logger.info('Installing Dependencies')
  execSync(packageManager==='yarn'?'yarn':packageManagerInstall,{
    cwd: outdir
  })
  logger.info('Initial Build')
  execSync(packageManagerRun+' build',{
    cwd: outdir
  })
  console.log('\n'.repeat(2))
  // inspired heavily by create-svelte
  console.log(`${chalk.green.bold(`Your project, ${name}, is ready!`)}
Next Steps:
  ${chalk.grey('1:')} ${chalk.rgb(0xff,0x77,0xff)(`cd "${response.location}"`)}
  ${chalk.grey('2:')} ${chalk.rgb(0xff,0x77,0xff)(`git init && git add . && git commit -m "feat: Initial Commit"`)} (optional)
  ${chalk.grey('3:')} ${chalk.rgb(0xff,0x77,0xff)(`${packageManagerRun} dev`)}

To close the dev server, hit Ctrl-C

Need to build a production build? Use ${chalk.rgb(0xff,0x77,0xff)(`${packageManagerRun} build`)}

Stuck? Talk to us at ${chalk.underline('https://cord.breadhub.cc/')}`);
  // logger.info('Dev Instructions',`To start a development server using blb & ${packageManager}, run '${packageManagerRun} dev' in the project directory\n     Usage Instructions will be shown in the console`)
  // logger.info('Build Instructions',`To build your project using blb & ${packageManager}, run '${packageManagerRun} build' in the project directory\n     The resulting file will be 'out.lua'`)
  // logger.info('Source Code','The Source Code is located in the \'src\' directory of '+outdir)
})()