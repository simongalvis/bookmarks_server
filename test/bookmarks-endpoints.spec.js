const knex = require('knex')
const fixtures = require('./bookmarks-fixtures')
const app = require('../src/app')
// TODO: remove when updating POST and DELETE
const store = require('../src/store')
const { makeBookmarksArray } = require('./bookmarks-fixtures')
const supertest = require('supertest')

describe('Bookmarks Endpoints', () => {
  let bookmarksCopy, db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  // TODO: refactor to use db when updating POST and DELETE
  beforeEach('copy the bookmarks', () => {
    // copy the bookmarks so we can restore them after testing
    bookmarksCopy = store.bookmarks.slice()
  })

  // TODO: refactor to use db when updating POST and DELETE
  afterEach('restore the bookmarks', () => {
    // restore the bookmarks back to original
    store.bookmarks = bookmarksCopy
  })

/*   describe(`Unauthorized requests`, () => {
    it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
      return supertest(app)
        .get('/bookmarks')
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
      return supertest(app)
        .post('/bookmarks')
        .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
      const secondBookmark = store.bookmarks[1]
      return supertest(app)
        .get(`/bookmarks/${secondBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })

    it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
      const aBookmark = store.bookmarks[1]
      return supertest(app)
        .delete(`/bookmarks/${aBookmark.id}`)
        .expect(401, { error: 'Unauthorized request' })
    })
  })
 */
  describe('GET /bookmarks', () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = fixtures.makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('gets the bookmarks from the store', () => {
        return supertest(app)
          .get('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })
  })

  describe('GET /bookmarks/:id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 whe bookmark doesn't exist`, () => {
        return supertest(app)
          .get(`/bookmarks/123`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark not found` }
          })
      }) 
    })

    context('Given there are bookmarks in the database', () => {
      describe(`GET /bookmark/:bookmark_id`, () => {

       
    
       context(`Given an XSS attack bookmark`, () => {
         const maliciousBookmark = {
           id:911,
           title: 'Naughty naughty very naughty <script>alert("xss");</script>',
           url: "https://test.com",
           description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
           rating: '2',
         }
    
         beforeEach('insert malicious bookmark', () => {
           return db
             .into('bookmarks')
             .insert([ maliciousBookmark ])
         })

         beforeEach('cleanup', () => db('bookmarks').truncate())
    
         it('removes XSS attack content on GET', () => {
           return supertest(app)
             .get(`/bookmarks/${maliciousBookmark.id}`)
             .expect(200)
             .expect(res => {
               expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
               expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
             })
         })
         it.only('removes XSS attack content on POST', () => {
          return supertest(app)
            .post(`/bookmarks`)
            .send(maliciousBookmark)
            .expect(201)
            .expect(res => {
              expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
              expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
            })
        })
       })
      const testBookmarks = fixtures.makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedBookmark)
      })
    })
  })

  // TODO: update to use db
  describe('DELETE /bookmarks/:id', () => {
    context('Given there are bookmarks in the database', () =>{
      const testBookmarks = makeBookmarksArray()
      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })
    it('removes the bookmark by ID from the store', () => {
      const idToRemove = 2
      const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
      return supertest(app)
        .delete(`/bookmarks/${idToRemove}`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(204)
        .then(res => {
          expect(expectedBookmarks)
        })
    })

    it(`returns 404 when bookmark doesn't exist`, () => {
      return supertest(app)
        .delete(`/bookmarks/696899887`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(404, { error: { message: `Bookmark not found`} })
    })
    console.log('hello')
  })
  context(`Given no bookmarks`, () =>{
    it(`responds with  404`, () =>{
      const bookmarkId = 12345
      return supertest(app)
        .delete(`/bookmarks/${bookmarkId}`)
        .expect(404, { error: { message: `Bookmark not found`} })
    })
  })
  })

  // TODO: update to use db
  describe('POST /bookmarks', () => {
    it(`responds with 400 missing 'title' if not supplied`, () => {
      const newBookmarkMissingTitle = {
        // title: 'test-title',
        url: 'https://test.com',
        rating: 1,
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingTitle)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'title' is required`)
    })

    it(`responds with 400 missing 'url' if not supplied`, () => {
      const newBookmarkMissingUrl = {
        title: 'test-title',
        // url: 'https://test.com',
        description:"Test description",
        rating: 1,
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' is required`)
    })

    it(`responds with 400 missing 'rating' if not supplied`, () => {
      const newBookmarkMissingRating = {
        title: 'test-title',
        url: 'https://test.com',
        // rating: 1,
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkMissingRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'rating' is required`)
    })

    it(`responds with 400 invalid 'rating' if not between 0 and 5`, () => {
      const newBookmarkInvalidRating = {
        title: 'test-title',
        url: 'https://test.com',
        description: "Test decription",
        rating: 'invalid',
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'rating' must be a number between 0 and 5`)
    })

    it(`responds with 400 invalid 'url' if not a valid URL`, () => {
      const newBookmarkInvalidUrl = {
        title: 'test-title',
        url: 'htp://invalid-url',
        rating: 1,
        description: "Test description"
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, `'url' must be a valid URL`)
    })

    it('adds a new bookmark to the store', () => {
      const newBookmark = {
        title: 'test-title',
        url: 'https://test.com',
        description: 'test description',
        rating: '5',
      }
      return supertest(app)
        .post(`/bookmarks`)
        .send(newBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body.id).to.be.a('string')
        })
        .then(res => {
          expect(store.bookmarks[store.bookmarks.length - 1]).to.eql(res.body)
        })
    })
  })

  })})
