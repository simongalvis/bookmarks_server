const express = require("express");
const uuid = require("uuid/v4");
const { isWebUri } = require("valid-url");
const logger = require("../logger");
const store = require("../store");
const BookmarksService = require("./bookmarks-service");
const xss = require("xss");

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: bookmark.title,
  url: bookmark.url,
  description: bookmark.description,
  rating: Number(bookmark.rating),
});

//URL checker: Checks wheter input URL is valid
function validURL(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

bookmarksRouter
  .route("/")
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get("db"))
      .then((bookmarks) => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    console.log(req.body);
    const { title, url, description, rating } = req.body;
    const newBookmark = { title, url, rating, description };

    console.log("rating: " + newBookmark.rating);

    for (const [key, value] of Object.entries(newBookmark))
      if (value == null) {
        return res.status(400).send(`'${key}' is required`);
      }
    if (
      newBookmark.rating < 0 ||
      newBookmark.rating > 5 ||
      isNaN(newBookmark.rating) == true
    ) {
      return res.status(400).send(`'rating' must be a number between 0 and 5`);
    }
    if (!validURL(newBookmark.url)) {
      return res.status(400).send(`'url' must be a valid URL`);
    }

    BookmarksService.insertBookmark(req.app.get("db"), newBookmark)
      .then((bookmark) => {
        res
          .status(201)
          .location(req.originalUrl + `${bookmark.id}`)
          .json({
            id:bookmark.id,
            title:xss(bookmark.title),
            url:bookmark.url,
            description:xss(bookmark.description), 
            rating:parseInt(bookmark.rating)
          }
          );
      })

      .catch(next);

    //console.log("resbodyrating: " + req.body.rating);
  });

bookmarksRouter
  .route("/:bookmark_id")
  .all((req, res, next) => {
   
    const { bookmark_id } = req.params;
    console.log('bmid: ' + bookmark_id)
    BookmarksService.getById(req.app.get("db"), bookmark_id)
      .then((bookmark) => {

        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`);
          return res.status(404).json({
            error: { message: `Bookmark not found` },
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) =>{
    res.json({
      id:res.bookmark.id,
      title:xss(res.bookmark.title),
      url:res.bookmark.url,
      description:xss(res.bookmark.description), 
      rating:parseInt(res.bookmark.rating)
    })
  })

  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.bookmark_id
    )
    .then((bookmark) => {
      if (!bookmark) {
        logger.error(`Bookmark with id ${bookmark_id} not found.`);
        return res.status(404).json({
          error: { message: `Bookmark Not Found` },
        });
      }
      res.bookmark = bookmark;
      next();
    })
     
    .then(() => {
      res.status(204).end()
    })
    .catch(next)
    // TODO: update to use db
/*     const { bookmark_id } = req.params;

    const bookmarkIndex = store.bookmarks.findIndex(
      (b) => b.id === bookmark_id
    );

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${bookmark_id} not found.`);
      return res.status(404).send("Bookmark Not Found");
    }

    
    store.bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${bookmark_id} deleted.`);
    res.status(204).end(); */
  })
  .patch(bodyParser, (req,res, next) =>{
    //const { bookmark_id } = req.params.bookmark_id
    const { title, url, description, rating } = req.body
    const bookmarkToUpdate = { title, url, description, rating }
//console.log(bookmark_id)
    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
   if (numberOfValues === 0) {

     return res.status(400).json({
       error: {
         message: `Request body must contain either 'title', 'url', 'description', or 'rating'`
       }
     })
   }




    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.bookmark_id,
      bookmarkToUpdate
    )
    .then(numRowsAffected => {
      res.status(204).end()
    })
    .catch(next)
  })


module.exports = bookmarksRouter;
 