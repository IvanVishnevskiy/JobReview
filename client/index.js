import Koa from 'koa'
import { createReadStream } from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = new Koa()

app.use(async (ctx, next) => {
    ctx.type = 'html'
    ctx.response.status = 200
    ctx.body = createReadStream(path.resolve(__dirname, './index.html'))
})

app.listen(8000)
