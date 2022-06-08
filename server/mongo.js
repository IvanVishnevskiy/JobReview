import { MongoClient } from 'mongodb'
// save mongo instance if we already have it
let mongoInstance = null

const getMongo = async (tries = 0) => {
    if (tries > 10) {
        // error handling goes in there, smth like telegram monitoring
        throw new Error('MongoDB seems to be broken')
    }
    if (mongoInstance) return mongoInstance
    const url = 'mongodb://0.0.0.0:27017'
    const db = await new Promise((resolve) => {
        MongoClient.connect(url, async (err, db) => {
            if (err) {
                // clear saved mongo instance
                if (mongoInstance && mongoInstance.close) mongoInstance.close()
                mongoInstance = null
                // wait 1 second
                await new Promise((resolve) => setTimeout(resolve, 1000))

                // recursion! until mongo starts working or we reach 10 iterations
                return await getMongo(tries++)
            }

            // save our mongo instance
            mongoInstance = db.db('jobreview')
            resolve(db.db('jobreview'))
        })
    })
    return db
}

export { getMongo }
