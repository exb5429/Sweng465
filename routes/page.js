var express = require('Express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('page', { title: 'Project' });
});

module.exports = router;