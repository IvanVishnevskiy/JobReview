// JS Date doesn't have a method to convert itself to an ISO string with timezone offset,
// so the obvious way around it is to construct it manually. Another option would to use toISOString
// and add offset on top, but this solution is arguably more clear
// One can also use moment, but added complexity does not outweigh the benefits in this particular case
const toISOString = (date) => {
    // Timezone offset
    const offset = -date.getTimezoneOffset()
    const offsetSymbol = offset >= 0 ? '+' : '-'
    // add leading zero // 5 -> 05
    const pad = (num) => `${num < 10 ? '0' : ''}${num}`

    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const realDate = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
    const offsetHours = pad(Math.floor(Math.abs(offset) / 60))
    const offsetMinutes = pad(Math.abs(offset) % 60)

    // construct full ISO date
    return `${year}-${month}-${realDate}T${hours}:${minutes}:${seconds}${offsetSymbol}${offsetHours}:${offsetMinutes}`
}

// Tracker class, could be done as a function, but it's nice to hold
// all the variables inside and also we can reuse it that way
class Tracker {
    // event buffer
    buffer = []
    // where to send tracking data
    path = ''
    // last sent data timestamp
    lastSendTimestamp = Number(new Date())
    // timeout controller used to get rid of multiple shouldSend method calls
    // if we have a lot of events
    timeoutController

    constructor({ path }) {
        this.path = path
    }

    // add a new event to the event buffer
    track = (event, ...tags) => {
        const bufferEvent = {
            event,
            tags,
            url: window.location.href,
            title: document.title,
            ts: toISOString(new Date()),
        }
        this.buffer.push(bufferEvent)

        // if it is a click-link event, send data using sendBeacon
        if (event === 'click-link') this.handleNavigationOrTabClose()
        else this.report()
    }

    // Send tracking data when using links or closing tab/browser
    // using sendBeacon method
    handleNavigationOrTabClose = () => {
        const { buffer } = this
        this.buffer = []

        // nothing to send
        if (!buffer.length) return
        navigator.sendBeacon(this.path, JSON.stringify(buffer))
    }

    // Check if we should send data to the server
    shouldSend = () => {
        const { buffer, lastSendTimestamp } = this
        // idiotproof
        if (!buffer.length) return false
        const timestamp = Number(new Date())

        if (buffer.length >= 3 || timestamp - lastSendTimestamp >= 1000)
            return true
        else return false
    }

    // Send events to the server if all the criteria are matched
    report = (force) => {
        const shouldSend = force ? true : this.shouldSend()
        const { buffer, path } = this

        if (!shouldSend && buffer.length) {
            const { lastSendTimestamp } = this
            clearTimeout(this.timeoutController)
            // Correct timeout to a full second. It's not really "necessary", but it makes more sense
            // to send data with at least 1 second gap if we don't have 3 events
            this.timeoutController = setTimeout(
                this.report,
                lastSendTimestamp - new Date() + 1000
            )
            return
        } else if (!shouldSend) {
            return
        }

        this.lastSendTimestamp = Number(new Date())

        this.buffer = []
        // no real point in using async/await
        fetch(path, {
            method: 'POST',
            body: JSON.stringify(buffer),
            headers: { 'Content-Type': 'application/json' },
        })
            .then((req) => {
                // if our request didn't work, wait one second before trying to re-send it, same in catch block
                if (req.status !== 200) {
                    this.buffer = [...this.buffer, ...buffer] // Return data to buffer
                    setTimeout(this.report, 1000)
                }
            })
            .catch((e) => {
                this.buffer = [...this.buffer, ...buffer] // Return data to buffer
                setTimeout(() => this.report(), 1000)
            })
    }
}

const tracker = new Tracker({ path: 'http://localhost:8001/track' })

// We need this event to detect when user closes tab or browser so that 
// we don't ever lose any tracking data
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        tracker.handleNavigationOrTabClose()
    }
})
