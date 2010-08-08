module("basic context");

var shouldCompileTo = function(string, hash, result, message) {
  var template = Handlebars.compile(string);
  var params = toString.call(hash) === "[object Array]" ? hash : [hash, undefined];
  equal(template.apply(this, params), result, message);
}

test("compiling with a basic context", function() {
  shouldCompileTo("Goodbye\n{{cruel}}\n{{world}}!", {cruel: "cruel", world: "world"}, "Goodbye\ncruel\nworld!",
                  "It works if all the required keys are provided");
});

test("comments", function() {
  shouldCompileTo("{{! Goodbye}}Goodbye\n{{cruel}}\n{{world}}!", 
    {cruel: "cruel", world: "world"}, "Goodbye\ncruel\nworld!",
    "comments are ignored");
});

test("boolean", function() {
  var string   = "{{#goodbye}}GOODBYE {{/goodbye}}cruel {{world}}!";
  shouldCompileTo(string, {goodbye: true, world: "world"}, "GOODBYE cruel world!",
                  "booleans show the contents when true");

  shouldCompileTo(string, {goodbye: false, world: "world"}, "cruel world!",
                  "booleans do not show the contents when false");
});

test("functions", function() {
  shouldCompileTo("{{awesome}}", {awesome: function() { return "Awesome"; }}, "Awesome",
                  "functions are called and render their output");
});

test("nested paths", function() {
  shouldCompileTo("Goodbye {{alan/expression}} world!", {alan: {expression: "beautiful"}},
                  "Goodbye beautiful world!", "Nested paths access nested objects");
});

test("bad idea nested paths", function() {
  var caught = false;
  try {
    Handlebars.compile("{{#goodbyes}}{{../name/../name}}{{/goodbyes}}"); 
  } catch (e) {
    if (e instanceof Handlebars.ParseError) {
      caught = true;
    }
  }
  equals(caught, true, "Cannot jump (..) into previous context after moving into context.");

  var string = "{{#goodbyes}}{{.././world}} {{/goodbyes}}";
  var hash     = {goodbyes: [{text: "goodbye"}, {text: "Goodbye"}, {text: "GOODBYE"}], world: "world"};
  shouldCompileTo(string, hash, "world world world ", "Same context (.) is ignored in paths");
});

test("this keyword in paths", function() {
  var string = "{{#goodbyes}}{{this}}{{/goodbyes}}";
  var hash = {goodbyes: ["goodbye", "Goodbye", "GOODBYE"]};
  shouldCompileTo(string, hash, "goodbyeGoodbyeGOODBYE", 
    "This keyword in paths evaluates to current context"); 

  string = "{{#hellos}}{{this/text}}{{/hellos}}"
  hash = {hellos: [{text: "hello"}, {text: "Hello"}, {text: "HELLO"}]};
  shouldCompileTo(string, hash, "helloHelloHELLO", "This keyword evaluates in more complex paths");
});

module("blocks");

test("array", function() {
  var string   = "{{#goodbyes}}{{text}}! {{/goodbyes}}cruel {{world}}!"
  var hash     = {goodbyes: [{text: "goodbye"}, {text: "Goodbye"}, {text: "GOODBYE"}], world: "world"};
  shouldCompileTo(string, hash, "goodbye! Goodbye! GOODBYE! cruel world!",
                  "Arrays iterate over the contents when not empty");

  shouldCompileTo(string, {goodbyes: [], world: "world"}, "cruel world!",
                  "Arrays ignore the contents when empty");

});

test("nested iteration", function() {

});

test("block with complex lookup", function() {
  var string = "{{#goodbyes}}{{text}} cruel {{../name}}! {{/goodbyes}}"
  var hash     = {name: "Alan", goodbyes: [{text: "goodbye"}, {text: "Goodbye"}, {text: "GOODBYE"}]};

  shouldCompileTo(string, hash, "goodbye cruel Alan! Goodbye cruel Alan! GOODBYE cruel Alan! ",
                  "Templates can access variables in contexts up the stack with relative path syntax");
});

test("helper with complex lookup", function() {
  var string = "{{#goodbyes}}{{link}}{{/goodbyes}}"
  var hash = {prefix: "/root", goodbyes: [{text: "Goodbye", url: "goodbye"}]};
  var fallback = {link: function() { 
    return "<a href='" + this.__get__("../prefix") + "/" + this.url + "'>" + this.text + "</a>" 
  }};
  shouldCompileTo(string, [hash, fallback], "<a href='/root/goodbye'>Goodbye</a>")
});

test("block with deep nested complex lookup", function() {
  var string = "{{#outer}}Goodbye {{#inner}}cruel {{../../omg}}{{/inner}}{{/outer}}";
  var hash = {omg: "OMG!", outer: [{ inner: [{ text: "goodbye" }] }] };

  shouldCompileTo(string, hash, "Goodbye cruel OMG!");
});

test("block helper", function() {
  var string   = "{{#goodbyes}}{{text}}! {{/goodbyes}}cruel {{world}}!";
  var template = Handlebars.compile(string);

  result = template({goodbyes: function(fn) { return fn({text: "GOODBYE"}); }, world: "world"});
  equal(result, "GOODBYE! cruel world!");
});

test("block helper staying in the same context", function() {
  var string   = "{{#form}}<p>{{name}}</p>{{/form}}"
  var template = Handlebars.compile(string);

  result = template({form: function(fn) { return "<form>" + fn(this) + "</form>" }, name: "Yehuda"});
  equal(result, "<form><p>Yehuda</p></form>");
});

test("block helper passing a new context", function() {
  var string   = "{{#form yehuda}}<p>{{name}}</p>{{/form}}"
  var template = Handlebars.compile(string);

  result = template({form: function(fn) { return "<form>" + fn(this) + "</form>" }, yehuda: {name: "Yehuda"}});
  equal(result, "<form><p>Yehuda</p></form>");
});

test("block helper passing a complex path context", function() {
  var string   = "{{#form yehuda/cat}}<p>{{name}}</p>{{/form}}"
  var template = Handlebars.compile(string);

  result = template({form: function(fn) { return "<form>" + fn(this) + "</form>" }, yehuda: {name: "Yehuda", cat: {name: "Harold"}}});
  equal(result, "<form><p>Harold</p></form>");
});

test("nested block helpers", function() {
  var string   = "{{#form yehuda}}<p>{{name}}</p>{{#link}}Hello{{/link}}{{/form}}"
  var template = Handlebars.compile(string);

  result = template({form: function(fn) { return "<form>" + fn(this) + "</form>" }, yehuda: {name: "Yehuda", link: function(fn) { return "<a href='" + this.name + "'>" + fn(this) + "</a>"; }}});
  equal(result, "<form><p>Yehuda</p><a href='Yehuda'>Hello</a></form>");
});

module("fallback hash");

test("providing a fallback hash", function() {
  shouldCompileTo("Goodbye {{cruel}} {{world}}!", [{cruel: "cruel"}, {world: "world"}], "Goodbye cruel world!",
                  "Fallback hash is available");

  shouldCompileTo("Goodbye {{#iter}}{{cruel}} {{world}}{{/iter}}!", [{iter: [{cruel: "cruel"}]}, {world: "world"}],
                  "Goodbye cruel world!", "Fallback hash is available inside other blocks");
});

test("in cases of conflict, the explicit hash wins", function() {

});

test("the fallback hash is available is nested contexts", function() {

});

module("partials");

