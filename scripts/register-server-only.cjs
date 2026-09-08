const Module = require("module");
const path = require("path");

const stubPath = path.join(__dirname, "server-only-stub.cjs");
require.cache[stubPath] = {
  id: stubPath,
  filename: stubPath,
  loaded: true,
  exports: {},
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "server-only") return stubPath;
  return originalResolve.call(this, request, parent, isMain, options);
};
