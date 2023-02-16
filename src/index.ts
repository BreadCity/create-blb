import prompts from 'prompts';
import Logger from '@exponentialworkload/logger';
Logger.postGuillemet=true;
(async()=>{
  const logger = new Logger()
  const response = await prompts({
    name: 'url',
    type: 'text',
    message: 'Enter a URL to fetch',
    validate: (data):boolean|string=>{
      try {
        new URL(data)
      } catch (error) {
        return `Invalid URL`
      }
      return true
    }
  })
  if (!response || !response.url) return logger.error('No Response URL')
  const status = logger.status('Fetching URL')
  // @ts-ignore
  const httpresponse = await fetch(response.url).catch((err: any)=>{
    status.done(false,'Failed to Fetch',err.message ?? err.toString())
    return;
  })
  if (!httpresponse)
    return;
  status.updateStatus('Converting to Text')
  const text = (await httpresponse.text().catch((err:any)=>{
    status.done(false,'Failed to convert to Text',err.message ?? err.toString())
    return;
  }))?.trim()
  if (!text) return;
  status.done(true, 'Fetched URL')
  logger.info('Response (trimmed)',text.length>32?text.substring(0,32)+'...':text)
})()