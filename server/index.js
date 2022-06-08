import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import { createReadStream } from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import { getMongo } from './mongo.js'

// check if given event is compliant with the requirements
const isValidEvent = (e) => {
    // String, Array, String, String, Date
    const { event, tags, url, title, ts } = e
    const date = new Date(ts)

    // We check that date is valid using getDate method which can never return zero on a valid date
    // Another way is to replace it with plain Number(date), which will return NaN if date is invalid.
    return (
        event && tags && Array.isArray(tags) && url && title && date.getDate()
    )

    // Note how we can also test if received data is indeed RFC3339-compatible by using regex.
    // It's not clear whether we should validate date this way based on the task description though

    // return event && tags && Array.isArray(tags) && url && title && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(ts)
}

// Store event(s) in db
const storeInDB = async (events) => {
    const db = await getMongo()
    const tracking = db.collection('tracks')
    if (events.length > 1) tracking.insertMany(events)
    else tracking.insertOne(events[0])
}

// no __dirname in esm node
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = new Koa()
const router = new Router()

router
    .get('/', async (ctx, next) => {
        // Send JS file at "/" route
        await next()
        ctx.type = 'html'
        ctx.response.status = 200
        ctx.body = createReadStream(path.resolve(__dirname, './clientSide.js'))
    })
    .post('/track', (ctx) => {
        // Event processing function
        ctx.response.status = 200

        // get body provided by bodyParser
        let { body = [] } = ctx.request
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }
        const events = body.filter((event) => isValidEvent(event))
        if (!events.length) return
        else storeInDB(events)
    })

app.use(cors())
app.use(bodyParser({ enableTypes: ['json', 'text'] }))
app.use(router.routes())

app.listen(8001)
