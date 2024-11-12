"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plugin = plugin;
var read_package_up_1 = require("read-package-up");
function plugin(userPluginInput) {
    if (userPluginInput === void 0) { userPluginInput = {}; }
    return {
        name: "external-dependencies-manifest",
        setup: function (build) {
            return __awaiter(this, void 0, void 0, function () {
                var Path, pluginOptions, state, resolveFilter, externalModules;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require("node:path"); })];
                        case 1:
                            Path = _a.sent();
                            pluginOptions = normalizeInput({
                                pluginInput: userPluginInput,
                                esbuildOptions: build.initialOptions,
                            });
                            return [4 /*yield*/, initializePluginState({
                                    esbuildOptions: build.initialOptions
                                })];
                        case 2:
                            state = _a.sent();
                            resolveFilter = pluginOptions.filterOverride;
                            externalModules = pluginOptions.externalsOverride;
                            /**
                             * If there aren't any external modules with which to build a package.json, effectively
                             * disable the plugin
                             */
                            if (!externalModules.length) {
                                return [2 /*return*/];
                            }
                            build.onResolve({ filter: resolveFilter }, function (args) { return __awaiter(_this, void 0, void 0, function () {
                                var resolved, entryPointsImporting;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, esbuildResolve(build, args)];
                                        case 1:
                                            resolved = _a.sent();
                                            if (!resolved) {
                                                return [2 /*return*/, resolved];
                                            }
                                            entryPointsImporting = state.importedToEntryPointMapping.get(args.importer);
                                            if (entryPointsImporting) {
                                                // Add the resolved path to the list of imports for the entry point
                                                state.updateImportedToEntryPointMapping({ key: args.importer, imports: resolved.path, originalEntryPoint: entryPointsImporting.originalEntryPoint });
                                                // Also add the current path as an "indirect entry-point", because anything that it imports is indirectly imported by the entry point
                                                state.updateImportedToEntryPointMapping({ key: resolved.path, imports: [], originalEntryPoint: entryPointsImporting.originalEntryPoint });
                                            }
                                            /**
                                             * If the module currently being resolved is in the `external` list, save it in a Map using its specifier as the key,
                                             * and the resolved path, the importer, and which directory it's being resolved from as the value
                                             */
                                            if (externalModules.includes(args.path)) {
                                                state.externalDependenciesManifest.set(args.path, {
                                                    path: resolved.path,
                                                    importer: args.importer,
                                                    resolveDir: args.resolveDir,
                                                });
                                            }
                                            return [2 /*return*/, resolved];
                                    }
                                });
                            }); });
                            /**
                             * At the end of the build this needs to use the import graph from each entry-point,
                             * the map of external modules that were actually resolved and what module(s) resolved them,
                             * and figure out the package.json that lists the external as a dependecy to retrieve the
                             * version, and the package.json of the entry-point to get reasonable defaults for the package name
                             */
                            build.onEnd(function (endArgs) { return __awaiter(_this, void 0, void 0, function () {
                                var manifests, _loop_1, _i, _a, _b, entryPoint, outputPath, endArgsWithCustom, custom;
                                var _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            manifests = {};
                                            _loop_1 = function (entryPoint, outputPath) {
                                                var packageManifestResult, entryPointPackageManifest, deps, _f, _g, _h, specifier, _j, path, importer, resolveDir, importedByEntryPoints, importerManifestResult, importerManifest, importerManifestPath, defInManifest;
                                                return __generator(this, function (_k) {
                                                    switch (_k.label) {
                                                        case 0: return [4 /*yield*/, (0, read_package_up_1.readPackageUp)({
                                                                cwd: Path.dirname(entryPoint),
                                                                normalize: true,
                                                            })];
                                                        case 1:
                                                            packageManifestResult = _k.sent();
                                                            if (!packageManifestResult) {
                                                                console.warn("Unable to find package.json for entry point ".concat(entryPoint));
                                                                return [2 /*return*/, "continue"];
                                                            }
                                                            entryPointPackageManifest = packageManifestResult.packageJson;
                                                            deps = {};
                                                            _f = 0, _g = state.externalDependenciesManifest.entries();
                                                            _k.label = 2;
                                                        case 2:
                                                            if (!(_f < _g.length)) return [3 /*break*/, 5];
                                                            _h = _g[_f], specifier = _h[0], _j = _h[1], path = _j.path, importer = _j.importer, resolveDir = _j.resolveDir;
                                                            importedByEntryPoints = state.pathToEntryPointMapping.get(specifier);
                                                            /**
                                                             * This means that the external dependency was resolved, but we don't know
                                                             * how to get from the specifier to the entry-point(s) that led to its resolution.
                                                             * That likely means the entry-point never imported this external, but some other entry-point
                                                             * did.
                                                             *
                                                             */
                                                            if (!importedByEntryPoints || !importedByEntryPoints.has(entryPoint)) {
                                                                return [3 /*break*/, 4];
                                                            }
                                                            return [4 /*yield*/, (0, read_package_up_1.readPackageUp)({
                                                                    cwd: Path.dirname(importer),
                                                                    normalize: true,
                                                                })];
                                                        case 3:
                                                            importerManifestResult = _k.sent();
                                                            if (!importerManifestResult) {
                                                                console.warn("Unable to find package.json for importer ".concat(importer, " of ").concat(path));
                                                                return [3 /*break*/, 4];
                                                            }
                                                            importerManifest = importerManifestResult.packageJson, importerManifestPath = importerManifestResult.path;
                                                            defInManifest = (_d = importerManifest.dependencies) === null || _d === void 0 ? void 0 : _d[specifier];
                                                            if (!defInManifest) {
                                                                return [3 /*break*/, 4];
                                                            }
                                                            // The golden nugget: save the external and its version, along with the path to the package.json which led to its import
                                                            deps[specifier] = {
                                                                path: path,
                                                                importer: importer,
                                                                manifest: importerManifestPath,
                                                                version: defInManifest,
                                                                resolveDir: resolveDir,
                                                            };
                                                            _k.label = 4;
                                                        case 4:
                                                            _f++;
                                                            return [3 /*break*/, 2];
                                                        case 5:
                                                            // Build the package.json using the output path of the entry-point as the key
                                                            manifests[outputPath] = {
                                                                name: entryPointPackageManifest.name,
                                                                version: entryPointPackageManifest.version,
                                                                dependencies: Object.keys(deps).reduce(function (acc, key) {
                                                                    acc[key] = deps[key].version;
                                                                    return acc;
                                                                }, {}),
                                                            };
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            _i = 0, _a = Object.entries((_c = state.entryPointsToOutput) !== null && _c !== void 0 ? _c : {});
                                            _e.label = 1;
                                        case 1:
                                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                                            _b = _a[_i], entryPoint = _b[0], outputPath = _b[1];
                                            return [5 /*yield**/, _loop_1(entryPoint, outputPath)];
                                        case 2:
                                            _e.sent();
                                            _e.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4:
                                            endArgsWithCustom = endArgs;
                                            custom = {
                                                manifestsByOutputPath: manifests,
                                                manifests: Object.entries(manifests).reduce(function (acc, _a) {
                                                    var outPath = _a[0], manifest = _a[1];
                                                    return __spreadArray(__spreadArray([], acc, true), [
                                                        {
                                                            outputPath: Path.dirname(outPath),
                                                            manifest: manifest,
                                                        }
                                                    ], false);
                                                }, []),
                                            };
                                            Object.assign(endArgsWithCustom, { custom: custom });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            return [2 /*return*/];
                    }
                });
            });
        },
    };
}
function esbuildResolve(build, args) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            // We need to make sure that esbuild doesn't try to resolve using this plugin recursively
            if (((_a = args.pluginData) !== null && _a !== void 0 ? _a : {}).skipExternalDependenciesManifest) {
                return [2 /*return*/, undefined];
            }
            // Fallback to default resolution
            return [2 /*return*/, build.resolve(args.path, {
                    importer: args.importer,
                    kind: args.kind,
                    namespace: args.namespace,
                    pluginData: __assign(__assign({}, ((_b = args.pluginData) !== null && _b !== void 0 ? _b : {})), { skipExternalDependenciesManifest: true, specifier: args.path, resolveDir: args.resolveDir }),
                    resolveDir: args.resolveDir,
                })];
        });
    });
}
function normalizeInput(normalizeInput) {
    var _a, _b, _c, _d;
    var defaultFilter = /.*/;
    var defaultExternals = (_a = normalizeInput.esbuildOptions.external) !== null && _a !== void 0 ? _a : [];
    var defaultEnabled = true;
    return __assign(__assign({}, normalizeInput.pluginInput), { filterOverride: (_b = normalizeInput.pluginInput.filterOverride) !== null && _b !== void 0 ? _b : defaultFilter, externalsOverride: (_c = normalizeInput.pluginInput.externalsOverride) !== null && _c !== void 0 ? _c : defaultExternals, enabled: (_d = normalizeInput.pluginInput.enabled) !== null && _d !== void 0 ? _d : defaultEnabled });
}
function initializePluginState(input) {
    return __awaiter(this, void 0, void 0, function () {
        var esbuildOptions, externalDependenciesManifest, originalEntryPoints, entryPoints, entryPointsToOutput, importedToEntryPointMapping, pathToEntryPointMapping, updateImportedToEntryPointMapping, _i, entryPoints_1, entryPoint;
        var _a;
        return __generator(this, function (_b) {
            esbuildOptions = input.esbuildOptions;
            externalDependenciesManifest = new Map();
            originalEntryPoints = (_a = esbuildOptions.entryPoints) !== null && _a !== void 0 ? _a : {};
            entryPoints = new Set(Array.isArray(originalEntryPoints) ? originalEntryPoints.reduce(function (acc, entryPoint) { return __spreadArray(__spreadArray([], acc, true), [
                typeof entryPoint === "string" ? entryPoint : entryPoint.in,
            ], false); }, []) : Object.values(originalEntryPoints));
            entryPointsToOutput = Array.isArray(originalEntryPoints) ? null : Object.entries(originalEntryPoints).reduce(function (acc, _a) {
                var _b, _c;
                var out = _a[0], entry = _a[1];
                acc[entry] = "".concat(out).concat((_c = (_b = esbuildOptions.outExtension) === null || _b === void 0 ? void 0 : _b[".js"]) !== null && _c !== void 0 ? _c : ".js");
                return acc;
            }, {});
            importedToEntryPointMapping = new Map();
            pathToEntryPointMapping = new Map();
            updateImportedToEntryPointMapping = function (_a) {
                var _b, _c, _d;
                var key = _a.key, imports = _a.imports, originalEntryPoint = _a.originalEntryPoint;
                var importsToAdd = Array.isArray(imports) ? imports : [imports];
                var existing = (_b = importedToEntryPointMapping.get(key)) !== null && _b !== void 0 ? _b : {
                    imports: new Set(),
                    originalEntryPoint: originalEntryPoint,
                };
                for (var _i = 0, importsToAdd_1 = importsToAdd; _i < importsToAdd_1.length; _i++) {
                    var importToAdd = importsToAdd_1[_i];
                    existing.imports.add(importToAdd);
                }
                importedToEntryPointMapping.set(key, existing);
                var originalEntryPointSet = (_c = pathToEntryPointMapping.get(key)) !== null && _c !== void 0 ? _c : new Set();
                originalEntryPointSet.add(existing.originalEntryPoint);
                pathToEntryPointMapping.set(key, originalEntryPointSet);
                for (var _e = 0, importsToAdd_2 = importsToAdd; _e < importsToAdd_2.length; _e++) {
                    var importToAdd = importsToAdd_2[_e];
                    var originalEntryPointSetOfImportToAdd = (_d = pathToEntryPointMapping.get(importToAdd)) !== null && _d !== void 0 ? _d : new Set();
                    originalEntryPointSetOfImportToAdd.add(existing.originalEntryPoint);
                    pathToEntryPointMapping.set(importToAdd, originalEntryPointSetOfImportToAdd);
                }
            };
            // Initialize the importedToEntryPointMapping with all entry points
            for (_i = 0, entryPoints_1 = entryPoints; _i < entryPoints_1.length; _i++) {
                entryPoint = entryPoints_1[_i];
                importedToEntryPointMapping.set(entryPoint, {
                    imports: new Set(),
                    originalEntryPoint: entryPoint,
                });
            }
            return [2 /*return*/, {
                    pathToEntryPointMapping: pathToEntryPointMapping,
                    externalDependenciesManifest: externalDependenciesManifest,
                    importedToEntryPointMapping: importedToEntryPointMapping,
                    entryPointsToOutput: entryPointsToOutput,
                    updateImportedToEntryPointMapping: updateImportedToEntryPointMapping,
                }];
        });
    });
}
