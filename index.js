const fs = require("fs"),
    request = require("request"),
    svg2img = require("svg2img"),
    cheerio = require("cheerio"),
    sqlite3 = require("sqlite3"),
    dir_build = "./CSS3.docset/",
    url_w3schools = "https://www.w3schools.com/",
    url_cssref = "https://www.w3schools.com/cssref/",
    url_images = "https://www.w3schools.com/images/",
    url_csslogo = "https://upload.wikimedia.org/wikipedia/commons/d/d5/CSS3_logo_and_wordmark.svg";

const guides = ["css_ref_aural.asp", "css_websafe_fonts.asp", "css_animatable.asp", "css_units.asp", "css_colors.asp",
    "css_colors_legal.asp", "css_default_values.asp", "css_entities.asp", "css_initial.asp", "css_inherit.asp"];

let dir_contents = dir_build + "Contents/",
    dir_resources = dir_contents + "Resources/",
    dir_documents = dir_resources + "Documents/",
    dir_w3schools = "www.w3schools.com/",
    dir_enUS = dir_w3schools + "en-US/",
    dir_cssref = dir_enUS + "cssref/",
    dir_styles = dir_cssref + "styles/",
    dir_styleImages = dir_styles + "images/";

const mkdirSync = function(dir_path) {
    try {
        fs.mkdirSync(dir_path);
    } catch (e) {
        if (e.code !== "EEXIST") console.error(e.message);
    }
};

const createDbTable = function() {
    db.run("CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);", function(e) {
        if (e) console.error(e.message);
        if (!e || e.errno === 1) createDbUniqueIndex();
    });
};
const createDbUniqueIndex = function() {
    db.run("CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);", function(e) {
        if (e) console.error(e.message);
    });
};

// TODO: - Remove broken examples (consider hyperlink)
//       - Download broken images
const parse = function(html) {
    let $ = cheerio.load(html);
    // add css
    $("#main").prepend('<head><link rel="stylesheet" href="./styles/browserref.css"></head>');

    // remove next and previous buttons
    $(".nextprev").remove();

    // remove ad containers
    $("#midcontentadcontainer").remove();

    // remove duplicate hr
    $("#main hr").each(function () {
        if (typeof $(this).next().get(0) != "undefined") {
            if ($(this).get(0).tagName === $(this).next().get(0).tagName) $(this).remove();
        }
    });

    // remove related pages
    $("#main h2:contains(Related Pages)").prev().nextUntil("br").remove();

    // remove all hr
    $("#main hr").remove();

    // remove leaderboard
    $("#mainLeaderboard").remove();

    // change w3-code div to pre
    $(".w3-code").each(function () {
        $(this).after("<pre>" + $(this).contents().toString().replace(/\r?\n|\r/g,'').trim() + "</pre>");
        $(this).remove();
    });

    // fix play it and try it && remove functions back button
    $("#main a").each(function () {
        let href = $(this).attr('href');
        if (href.includes("tryit.asp") || href.includes("playit.asp")) {
            $(this).attr('href', url_cssref + href);
        } else {
            $(this).attr('href', "./" + href.substr(0, href.length - 4) + ".html");
        }

        if (href.includes("css_functions.asp")) $(this).remove();
    });

    return $("#main").html();
};

const index = function(name, type, url) {
    request(url_cssref + url, function (error, response, html) {
        if (!error && response.statusCode == 200) {
            html = parse(html);

            let fileName = url.substr(0, url.length - 4) + ".html";
            let file = fs.createWriteStream(dir_documents + dir_cssref + fileName);
            file.write(html);
            file.end();

            db.run("INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('" + name + "', '" + type + "', '" + dir_cssref + fileName + "');");
        }
    });
};

/* Connect to SQLite database */
mkdirSync(dir_build); mkdirSync(dir_contents); mkdirSync(dir_resources);

let db = new sqlite3.Database(dir_resources + "docSet.dsidx", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (e) {
    if (e) return console.error(e);
    createDbTable();
});

/* index and download documentation */
mkdirSync(dir_documents); mkdirSync(dir_documents + dir_w3schools); mkdirSync(dir_documents + dir_enUS); mkdirSync(dir_documents + dir_cssref);

request(url_cssref, function (error, response, html) { // Properties
    if (!error && response.statusCode == 200) {
        let $ = cheerio.load(html);

        $(".w3-table-all a").each(function () {
            let name = $(this).text();
            let url =  $(this).attr("href");
            index(name, "Property", url);
        });
    }
});

request(url_cssref + "css_selectors.asp", function (error, response, html) { // Selectors
    if (!error && response.statusCode == 200) {
        let $ = cheerio.load(html);

        $(".w3-table-all a").each(function () {
            let name = $(this).text();
            let url =  $(this).attr("href");
            index(name, "Selector", url);
        });
    }
});

request(url_cssref + "css_functions.asp", function (error, response, html) { // Functions
    if (!error && response.statusCode == 200) {
        let $ = cheerio.load(html);

        $(".w3-table-all a").each(function () {
            let name = $(this).text();
            let url =  $(this).attr("href");
            index(name, "Function", url);
        });
    }
});

for (let i = 0; i < guides.length; i++) { // Guides
    let name = guides[i].substr(4, guides[i].length - 4).split('_').join('-');
    let url =  guides[i];
    index(name, "Guide", url);
}

/* Get CSS files */
mkdirSync(dir_documents + dir_styles);

request(url_w3schools + "browserref.css", function (error, response, css) {
    if (!error && response.statusCode == 200) {
        css = css.replace(/\/images/g, './images');

        let file = fs.createWriteStream(dir_documents + dir_styles + "browserref.css");
        file.write(css);
        file.end();
    }
});

/* Get browser icons */
mkdirSync(dir_documents + dir_styleImages);

request(url_images + "compatible_ie.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_ie.gif"));
request(url_images + "compatible_chrome.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_chrome.gif"));
request(url_images + "compatible_edge.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_edge.gif"));
request(url_images + "compatible_firefox.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_firefox.gif"));
request(url_images + "compatible_safari.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_safari.gif"));
request(url_images + "compatible_opera.gif").pipe(fs.createWriteStream(dir_documents + dir_styleImages + "compatible_opera.gif"));

/* Get css logo */
request(url_csslogo, function (error, response, xml) {
    if (!error && response.statusCode == 200) {
        const $ = cheerio.load(xml, {xmlMode: true});
        let svg = $("svg");
        svg.attr("width", "411.37998");
        svg.attr("height", "411.37998");
        svg.attr("viewBox", "0 100.62 362.73401 411.37998");

        svg2img($.xml(), {"width":16, "height":16}, function(e, b) {fs.writeFileSync(dir_build + "icon.png", b)});
        svg2img($.xml(), {"width":32, "height":32}, function(e, b) {fs.writeFileSync(dir_build + "icon@2x.png", b)});
    }
});

/* Get info.plist */
let plist = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' +
    '<dict>\n' +
    '\t<key>CFBundleIdentifier</key>\n' +
    '\t<string>css3</string>\n' +
    '\t<key>CFBundleName</key>\n' +
    '\t<string>CSS3</string>\n' +
    '\t<key>DocSetPlatformFamily</key>\n' +
    '\t<string>css3</string>\n' +
    '\t<key>isDashDocset</key>\n' +
    '\t<true/>\n' +
    '</dict>\n' +
    '</plist>';

let file = fs.createWriteStream(dir_contents + "Info.plist");
file.write(plist);
file.end();

/* Close SQLite database connection
db.close(function (e) {
    if (e) return console.error(e.message);
}); */