/*[system-bundles-config]*/
System.bundles = {"bundles/authentication/main.css!":["css/core.less!steal-less@1.3.4#less"]};
/*npm-utils*/
define('npm-utils', function (require, exports, module) {
    (function (global, require, exports, module) {
        var slice = Array.prototype.slice;
        var npmModuleRegEx = /.+@.+\..+\..+#.+/;
        var conditionalModuleRegEx = /#\{[^\}]+\}|#\?.+$/;
        var gitUrlEx = /(git|http(s?)):\/\//;
        var supportsSet = typeof Set === 'function';
        var utils = {
            extend: function (d, s, deep, existingSet) {
                var val;
                var set = existingSet;
                if (deep) {
                    if (!set) {
                        if (supportsSet) {
                            set = new Set();
                        } else {
                            set = [];
                        }
                    }
                    if (supportsSet) {
                        if (set.has(s)) {
                            return s;
                        } else {
                            set.add(s);
                        }
                    } else {
                        if (set.indexOf(s) !== -1) {
                            return s;
                        } else {
                            set.push(s);
                        }
                    }
                }
                for (var prop in s) {
                    val = s[prop];
                    if (deep) {
                        if (utils.isArray(val)) {
                            d[prop] = slice.call(val);
                        } else if (utils.isPlainObject(val)) {
                            d[prop] = utils.extend({}, val, deep, set);
                        } else {
                            d[prop] = s[prop];
                        }
                    } else {
                        d[prop] = s[prop];
                    }
                }
                return d;
            },
            map: function (arr, fn) {
                var i = 0, len = arr.length, out = [];
                for (; i < len; i++) {
                    out.push(fn.call(arr, arr[i]));
                }
                return out;
            },
            filter: function (arr, fn) {
                var i = 0, len = arr.length, out = [], res;
                for (; i < len; i++) {
                    res = fn.call(arr, arr[i]);
                    if (res) {
                        out.push(arr[i]);
                    }
                }
                return out;
            },
            forEach: function (arr, fn) {
                var i = 0, len = arr.length;
                for (; i < len; i++) {
                    fn.call(arr, arr[i], i);
                }
            },
            flow: function (fns) {
                return function () {
                    var res = fns[0].apply(this, arguments);
                    for (var i = 1; i < fns.length; i++) {
                        res = fns[i].call(this, res);
                    }
                    return res;
                };
            },
            isObject: function (obj) {
                return typeof obj === 'object';
            },
            isPlainObject: function (obj) {
                return utils.isObject(obj) && (!obj || obj.__proto__ === Object.prototype);
            },
            isArray: Array.isArray || function (arr) {
                return Object.prototype.toString.call(arr) === '[object Array]';
            },
            isEnv: function (name) {
                return this.isEnv ? this.isEnv(name) : this.env === name;
            },
            isGitUrl: function (str) {
                return gitUrlEx.test(str);
            },
            warnOnce: function (msg) {
                var w = this._warnings = this._warnings || {};
                if (w[msg])
                    return;
                w[msg] = true;
                this.warn(msg);
            },
            warn: function (msg) {
                if (typeof steal !== 'undefined' && typeof console !== 'undefined' && console.warn) {
                    steal.done().then(function () {
                        if (steal.dev && steal.dev.warn) {
                            steal.dev.warn(msg);
                        } else if (console.warn) {
                            console.warn('steal.js WARNING: ' + msg);
                        } else {
                            console.log(msg);
                        }
                    });
                }
            },
            relativeURI: function (baseURL, url) {
                return typeof steal !== 'undefined' ? steal.relativeURI(baseURL, url) : url;
            },
            moduleName: {
                create: function (descriptor, standard) {
                    if (standard) {
                        return descriptor.moduleName;
                    } else {
                        if (descriptor === '@empty') {
                            return descriptor;
                        }
                        var modulePath;
                        if (descriptor.modulePath) {
                            modulePath = descriptor.modulePath.substr(0, 2) === './' ? descriptor.modulePath.substr(2) : descriptor.modulePath;
                        }
                        var version = descriptor.version;
                        if (version && version[0] !== '^') {
                            version = encodeURIComponent(decodeURIComponent(version));
                        }
                        return descriptor.packageName + (version ? '@' + version : '') + (modulePath ? '#' + modulePath : '') + (descriptor.plugin ? descriptor.plugin : '');
                    }
                },
                isNpm: function (moduleName) {
                    return npmModuleRegEx.test(moduleName);
                },
                isConditional: function (moduleName) {
                    return conditionalModuleRegEx.test(moduleName);
                },
                isFullyConvertedNpm: function (parsedModuleName) {
                    return !!(parsedModuleName.packageName && parsedModuleName.version && parsedModuleName.modulePath);
                },
                isScoped: function (moduleName) {
                    return moduleName[0] === '@';
                },
                parse: function (moduleName, currentPackageName, global, context) {
                    var pluginParts = moduleName.split('!');
                    var modulePathParts = pluginParts[0].split('#');
                    var versionParts = modulePathParts[0].split('@');
                    if (!modulePathParts[1] && !versionParts[0]) {
                        versionParts = ['@' + versionParts[1]];
                    }
                    if (versionParts.length === 3 && utils.moduleName.isScoped(moduleName)) {
                        versionParts.splice(0, 1);
                        versionParts[0] = '@' + versionParts[0];
                    }
                    var packageName, modulePath;
                    if (currentPackageName && utils.path.isRelative(moduleName)) {
                        packageName = currentPackageName;
                        modulePath = versionParts[0];
                    } else if (currentPackageName && utils.path.isInHomeDir(moduleName, context)) {
                        packageName = currentPackageName;
                        modulePath = versionParts[0].split('/').slice(1).join('/');
                    } else {
                        if (modulePathParts[1]) {
                            packageName = versionParts[0];
                            modulePath = modulePathParts[1];
                        } else {
                            var folderParts = versionParts[0].split('/');
                            if (folderParts.length && folderParts[0][0] === '@') {
                                packageName = folderParts.splice(0, 2).join('/');
                            } else {
                                packageName = folderParts.shift();
                            }
                            modulePath = folderParts.join('/');
                        }
                    }
                    modulePath = utils.path.removeJS(modulePath);
                    return {
                        plugin: pluginParts.length === 2 ? '!' + pluginParts[1] : undefined,
                        version: versionParts[1],
                        modulePath: modulePath,
                        packageName: packageName,
                        moduleName: moduleName,
                        isGlobal: global
                    };
                },
                parseFromPackage: function (loader, refPkg, name, parentName) {
                    var packageName = utils.pkg.name(refPkg), parsedModuleName = utils.moduleName.parse(name, packageName, undefined, { loader: loader }), isRelative = utils.path.isRelative(parsedModuleName.modulePath);
                    if (isRelative && !parentName) {
                        throw new Error('Cannot resolve a relative module identifier ' + 'with no parent module:', name);
                    }
                    if (isRelative) {
                        var parentParsed = utils.moduleName.parse(parentName, packageName);
                        if (parentParsed.packageName === parsedModuleName.packageName && parentParsed.modulePath) {
                            var makePathRelative = true;
                            if (name === '../' || name === './' || name === '..') {
                                var relativePath = utils.path.relativeTo(parentParsed.modulePath, name);
                                var isInRoot = utils.path.isPackageRootDir(relativePath);
                                if (isInRoot) {
                                    parsedModuleName.modulePath = utils.pkg.main(refPkg);
                                    makePathRelative = false;
                                } else {
                                    parsedModuleName.modulePath = name + (utils.path.endsWithSlash(name) ? '' : '/') + 'index';
                                }
                            }
                            if (makePathRelative) {
                                parsedModuleName.modulePath = utils.path.makeRelative(utils.path.joinURIs(parentParsed.modulePath, parsedModuleName.modulePath));
                            }
                        }
                    }
                    var mapName = utils.moduleName.create(parsedModuleName), refSteal = utils.pkg.config(refPkg), mappedName;
                    if (refPkg.browser && typeof refPkg.browser !== 'string' && mapName in refPkg.browser && (!refSteal || !refSteal.ignoreBrowser)) {
                        mappedName = refPkg.browser[mapName] === false ? '@empty' : refPkg.browser[mapName];
                    }
                    var global = loader && loader.globalBrowser && loader.globalBrowser[mapName];
                    if (global) {
                        mappedName = global.moduleName === false ? '@empty' : global.moduleName;
                    }
                    if (mappedName) {
                        return utils.moduleName.parse(mappedName, packageName, !!global);
                    } else {
                        return parsedModuleName;
                    }
                },
                nameAndVersion: function (parsedModuleName) {
                    return parsedModuleName.packageName + '@' + parsedModuleName.version;
                },
                isBareIdentifier: function (identifier) {
                    return identifier && identifier[0] !== '.' && identifier[0] !== '@';
                }
            },
            pkg: {
                name: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    return steal && steal.name || pkg.name;
                },
                main: function (pkg) {
                    var main;
                    var steal = utils.pkg.config(pkg);
                    if (steal && steal.main) {
                        main = steal.main;
                    } else if (typeof pkg.browser === 'string') {
                        if (utils.path.endsWithSlash(pkg.browser)) {
                            main = pkg.browser + 'index';
                        } else {
                            main = pkg.browser;
                        }
                    } else if (typeof pkg.jam === 'object' && pkg.jam.main) {
                        main = pkg.jam.main;
                    } else if (pkg.main) {
                        main = pkg.main;
                    } else {
                        main = 'index';
                    }
                    return utils.path.removeJS(utils.path.removeDotSlash(main));
                },
                rootDir: function (pkg, isRoot) {
                    var root = isRoot ? utils.path.removePackage(pkg.fileUrl) : utils.path.pkgDir(pkg.fileUrl);
                    var lib = utils.pkg.directoriesLib(pkg);
                    if (lib) {
                        root = utils.path.joinURIs(utils.path.addEndingSlash(root), lib);
                    }
                    return root;
                },
                isRoot: function (loader, pkg) {
                    var root = utils.pkg.getDefault(loader);
                    return pkg && pkg.name === root.name && pkg.version === root.version;
                },
                homeAlias: function (context) {
                    return context && context.loader && context.loader.homeAlias || '~';
                },
                getDefault: function (loader) {
                    return loader.npmPaths.__default;
                },
                findByModuleNameOrAddress: function (loader, moduleName, moduleAddress) {
                    if (loader.npm) {
                        if (moduleName) {
                            var parsed = utils.moduleName.parse(moduleName);
                            if (parsed.version && parsed.packageName) {
                                var name = parsed.packageName + '@' + parsed.version;
                                if (name in loader.npm) {
                                    return loader.npm[name];
                                }
                            }
                        }
                        if (moduleAddress) {
                            var startingAddress = utils.relativeURI(loader.baseURL, moduleAddress);
                            var packageFolder = utils.pkg.folderAddress(startingAddress);
                            return packageFolder ? loader.npmPaths[packageFolder] : utils.pkg.getDefault(loader);
                        } else {
                            return utils.pkg.getDefault(loader);
                        }
                    }
                },
                folderAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                },
                findDep: function (loader, refPkg, name) {
                    if (loader.npm && refPkg && !utils.path.startsWithDotSlash(name)) {
                        var nameAndVersion = name + '@' + refPkg.resolutions[name];
                        var pkg = loader.npm[nameAndVersion];
                        return pkg;
                    }
                },
                findDepWalking: function (loader, refPackage, name) {
                    if (loader.npm && refPackage && !utils.path.startsWithDotSlash(name)) {
                        var curPackage = utils.path.depPackageDir(refPackage.fileUrl, name);
                        while (curPackage) {
                            var pkg = loader.npmPaths[curPackage];
                            if (pkg) {
                                return pkg;
                            }
                            var parentAddress = utils.path.parentNodeModuleAddress(curPackage);
                            if (!parentAddress) {
                                return;
                            }
                            curPackage = parentAddress + '/' + name;
                        }
                    }
                },
                findByName: function (loader, name) {
                    if (loader.npm && !utils.path.startsWithDotSlash(name)) {
                        return loader.npm[name];
                    }
                },
                findByNameAndVersion: function (loader, name, version) {
                    if (loader.npm && !utils.path.startsWithDotSlash(name)) {
                        var nameAndVersion = name + '@' + version;
                        return loader.npm[nameAndVersion];
                    }
                },
                findByUrl: function (loader, url) {
                    if (loader.npm) {
                        var fullUrl = utils.pkg.folderAddress(url);
                        return loader.npmPaths[fullUrl];
                    }
                },
                directoriesLib: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    var lib = steal && steal.directories && steal.directories.lib;
                    var ignores = [
                            '.',
                            '/'
                        ], ignore;
                    if (!lib)
                        return undefined;
                    while (!!(ignore = ignores.shift())) {
                        if (lib[0] === ignore) {
                            lib = lib.substr(1);
                        }
                    }
                    return lib;
                },
                hasDirectoriesLib: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    return steal && steal.directories && !!steal.directories.lib;
                },
                findPackageInfo: function (context, pkg) {
                    var pkgInfo = context.pkgInfo;
                    if (pkgInfo) {
                        var out;
                        utils.forEach(pkgInfo, function (p) {
                            if (pkg.name === p.name && pkg.version === p.version) {
                                out = p;
                            }
                        });
                        return out;
                    }
                },
                saveResolution: function (context, refPkg, pkg) {
                    var npmPkg = utils.pkg.findPackageInfo(context, refPkg);
                    npmPkg.resolutions[pkg.name] = refPkg.resolutions[pkg.name] = pkg.version;
                },
                config: function (pkg) {
                    return pkg.steal || pkg.system;
                }
            },
            path: {
                makeRelative: function (path) {
                    if (utils.path.isRelative(path) && path.substr(0, 1) !== '/') {
                        return path;
                    } else {
                        return './' + path;
                    }
                },
                removeJS: function (path) {
                    return path.replace(/\.js(!|$)/, function (whole, part) {
                        return part;
                    });
                },
                removePackage: function (path) {
                    return path.replace(/\/package\.json.*/, '');
                },
                addJS: function (path) {
                    if (/\.m?js(on)?$/.test(path)) {
                        return path;
                    } else {
                        return path + '.js';
                    }
                },
                isRelative: function (path) {
                    return path.substr(0, 1) === '.';
                },
                isInHomeDir: function (path, context) {
                    return path.substr(0, 2) === utils.pkg.homeAlias(context) + '/';
                },
                joinURIs: function (baseUri, rel) {
                    function removeDotSegments(input) {
                        var output = [];
                        input.replace(/^(\.\.?(\/|$))+/, '').replace(/\/(\.(\/|$))+/g, '/').replace(/\/\.\.$/, '/../').replace(/\/?[^\/]*/g, function (p) {
                            if (p === '/..') {
                                output.pop();
                            } else {
                                output.push(p);
                            }
                        });
                        return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
                    }
                    var href = parseURI(rel || '');
                    var base = parseURI(baseUri || '');
                    return !href || !base ? null : (href.protocol || base.protocol) + (href.protocol || href.authority ? href.authority : base.authority) + removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : href.pathname ? (base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname : base.pathname) + (href.protocol || href.authority || href.pathname ? href.search : href.search || base.search) + href.hash;
                },
                startsWithDotSlash: function (path) {
                    return path.substr(0, 2) === './';
                },
                removeDotSlash: function (path) {
                    return utils.path.startsWithDotSlash(path) ? path.substr(2) : path;
                },
                endsWithSlash: function (path) {
                    return path[path.length - 1] === '/';
                },
                addEndingSlash: function (path) {
                    return utils.path.endsWithSlash(path) ? path : path + '/';
                },
                depPackage: function (parentPackageAddress, childName) {
                    var packageFolderName = parentPackageAddress.replace(/\/package\.json.*/, '');
                    return (packageFolderName ? packageFolderName + '/' : '') + 'node_modules/' + childName + '/package.json';
                },
                peerPackage: function (parentPackageAddress, childName) {
                    var packageFolderName = parentPackageAddress.replace(/\/package\.json.*/, '');
                    return packageFolderName.substr(0, packageFolderName.lastIndexOf('/')) + '/' + childName + '/package.json';
                },
                depPackageDir: function (parentPackageAddress, childName) {
                    return utils.path.depPackage(parentPackageAddress, childName).replace(/\/package\.json.*/, '');
                },
                peerNodeModuleAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules);
                    if (nodeModulesIndex >= 0) {
                        return address.substr(0, nodeModulesIndex + nodeModules.length - 1);
                    }
                },
                parentNodeModuleAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), prevModulesIndex = address.lastIndexOf(nodeModules, nodeModulesIndex - 1);
                    if (prevModulesIndex >= 0) {
                        return address.substr(0, prevModulesIndex + nodeModules.length - 1);
                    }
                },
                pkgDir: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (address[nodeModulesIndex + nodeModules.length] === '@') {
                        nextSlash = address.indexOf('/', nextSlash + 1);
                    }
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                },
                basename: function (address) {
                    var parts = address.split('/');
                    return parts[parts.length - 1];
                },
                relativeTo: function (modulePath, rel) {
                    var parts = modulePath.split('/');
                    var idx = 1;
                    while (rel[idx] === '.') {
                        parts.pop();
                        idx++;
                    }
                    return parts.join('/');
                },
                isPackageRootDir: function (pth) {
                    return pth.indexOf('/') === -1;
                }
            },
            json: {
                transform: function (loader, load, data) {
                    data.steal = utils.pkg.config(data);
                    var fn = loader.jsonOptions && loader.jsonOptions.transform;
                    if (!fn)
                        return data;
                    return fn.call(loader, load, data);
                }
            },
            includeInBuild: true
        };
        function parseURI(url) {
            var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@\/]*(?::[^:@\/]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
            return m ? {
                href: m[0] || '',
                protocol: m[1] || '',
                authority: m[2] || '',
                host: m[3] || '',
                hostname: m[4] || '',
                port: m[5] || '',
                pathname: m[6] || '',
                search: m[7] || '',
                hash: m[8] || ''
            } : null;
        }
        module.exports = utils;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*npm-extension*/
define('npm-extension', [
    'require',
    'exports',
    'module',
    '@steal',
    './npm-utils'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'format cjs';
        var steal = require('@steal');
        var utils = require('./npm-utils');
        exports.includeInBuild = true;
        var isNode = typeof process === 'object' && {}.toString.call(process) === '[object process]';
        var isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
        var isElectron = isNode && !!process.versions.electron;
        var isBrowser = typeof window !== 'undefined' && (!isNode || isElectron) && !isWorker;
        exports.addExtension = function (System) {
            if (System._extensions) {
                System._extensions.push(exports.addExtension);
            }
            var oldNormalize = System.normalize;
            System.normalize = function (identifier, parentModuleName, parentAddress, pluginNormalize) {
                var name = identifier;
                var parentName = parentModuleName;
                if (parentName && this.npmParentMap && this.npmParentMap[parentName]) {
                    parentName = this.npmParentMap[parentName];
                }
                var hasNoParent = !parentName;
                var nameIsRelative = utils.path.isRelative(name);
                var parentIsNpmModule = utils.moduleName.isNpm(parentName);
                var identifierEndsWithSlash = utils.path.endsWithSlash(name);
                if (parentName && nameIsRelative && !parentIsNpmModule) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                if (utils.moduleName.isConditional(name)) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var hasContextualMap = typeof this.map[parentName] === 'object' && this.map[parentName][name];
                if (hasContextualMap) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var refPkg = utils.pkg.findByModuleNameOrAddress(this, parentName, parentAddress);
                if (!refPkg) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var isPointingAtParentFolder = name === '../' || name === './';
                if (parentIsNpmModule && isPointingAtParentFolder) {
                    var parsedParentModuleName = utils.moduleName.parse(parentName);
                    var parentModulePath = parsedParentModuleName.modulePath || '';
                    var relativePath = utils.path.relativeTo(parentModulePath, name);
                    var isInRoot = utils.path.isPackageRootDir(relativePath);
                    if (isInRoot) {
                        name = refPkg.name + '#' + utils.path.removeJS(utils.path.removeDotSlash(refPkg.main));
                    } else {
                        name = name + 'index';
                    }
                }
                var parsedModuleName = utils.moduleName.parseFromPackage(this, refPkg, name, parentName);
                var isRoot = utils.pkg.isRoot(this, refPkg);
                var parsedPackageNameIsReferringPackage = parsedModuleName.packageName === refPkg.name;
                var isRelativeToParentNpmModule = parentIsNpmModule && nameIsRelative && parsedPackageNameIsReferringPackage;
                var depPkg, wantedPkg;
                if (isRelativeToParentNpmModule) {
                    depPkg = refPkg;
                }
                var context = this.npmContext;
                var crawl = context && context.crawl;
                var isDev = !!crawl;
                if (!depPkg) {
                    if (crawl) {
                        var parentPkg = nameIsRelative ? null : crawl.matchedVersion(context, refPkg.name, refPkg.version);
                        if (parentPkg) {
                            var depMap = crawl.getFullDependencyMap(this, parentPkg, isRoot);
                            wantedPkg = depMap[parsedModuleName.packageName];
                            if (wantedPkg) {
                                var wantedVersion = refPkg.resolutions && refPkg.resolutions[wantedPkg.name] || wantedPkg.version;
                                var foundPkg = crawl.matchedVersion(this.npmContext, wantedPkg.name, wantedVersion);
                                if (foundPkg) {
                                    depPkg = utils.pkg.findByUrl(this, foundPkg.fileUrl);
                                }
                            }
                        }
                    } else {
                        if (isRoot) {
                            depPkg = utils.pkg.findDepWalking(this, refPkg, parsedModuleName.packageName);
                        } else {
                            depPkg = utils.pkg.findDep(this, refPkg, parsedModuleName.packageName);
                        }
                    }
                }
                if (parsedPackageNameIsReferringPackage) {
                    depPkg = utils.pkg.findByNameAndVersion(this, parsedModuleName.packageName, refPkg.version);
                }
                var lookupByName = parsedModuleName.isGlobal || hasNoParent;
                if (!depPkg) {
                    depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
                }
                var isThePackageWeWant = !isDev || !depPkg || (wantedPkg ? crawl.pkgSatisfies(depPkg, wantedPkg.version) : true);
                if (!isThePackageWeWant) {
                    depPkg = undefined;
                } else if (isDev && depPkg) {
                    utils.pkg.saveResolution(context, refPkg, depPkg);
                }
                if (!depPkg) {
                    var browserPackageName = this.globalBrowser[parsedModuleName.packageName];
                    if (browserPackageName) {
                        parsedModuleName.packageName = browserPackageName.moduleName;
                        depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
                    }
                }
                if (!depPkg && isRoot && name === refPkg.main && utils.pkg.hasDirectoriesLib(refPkg)) {
                    parsedModuleName.version = refPkg.version;
                    parsedModuleName.packageName = refPkg.name;
                    parsedModuleName.modulePath = utils.pkg.main(refPkg);
                    return oldNormalize.call(this, utils.moduleName.create(parsedModuleName), parentName, parentAddress, pluginNormalize);
                }
                var loader = this;
                if (!depPkg) {
                    if (crawl) {
                        var parentPkg = crawl.matchedVersion(this.npmContext, refPkg.name, refPkg.version);
                        if (parentPkg) {
                            var depMap = crawl.getFullDependencyMap(this, parentPkg, isRoot);
                            depPkg = depMap[parsedModuleName.packageName];
                            if (!depPkg) {
                                var parents = crawl.findPackageAndParents(this.npmContext, parsedModuleName.packageName);
                                if (parents) {
                                    depPkg = parents.package;
                                }
                            }
                        }
                    }
                    if (!depPkg) {
                        if (refPkg.browser && refPkg.browser[name]) {
                            return oldNormalize.call(this, refPkg.browser[name], parentName, parentAddress, pluginNormalize);
                        }
                        var steal = utils.pkg.config(refPkg);
                        if (steal && steal.map && typeof steal.map[name] === 'string') {
                            var mappedName = steal.map[name];
                            var envConfig = steal.envs && steal.envs[loader.env];
                            if (envConfig && envConfig.map && typeof envConfig.map[name] === 'string') {
                                mappedName = envConfig.map[name];
                            }
                            return loader.normalize(mappedName, parentName, parentAddress, pluginNormalize);
                        } else {
                            return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                        }
                    }
                    return crawl.dep(this.npmContext, parentPkg, refPkg, depPkg, isRoot).then(createModuleNameAndNormalize);
                } else {
                    return createModuleNameAndNormalize(depPkg);
                }
                function createModuleNameAndNormalize(depPkg) {
                    parsedModuleName.version = depPkg.version;
                    if (!parsedModuleName.modulePath) {
                        parsedModuleName.modulePath = utils.pkg.main(depPkg);
                    }
                    var p = oldNormalize.call(loader, utils.moduleName.create(parsedModuleName), parentName, parentAddress, pluginNormalize);
                    if (identifierEndsWithSlash) {
                        p.then(function (name) {
                            if (context && context.forwardSlashMap) {
                                context.forwardSlashMap[name] = true;
                            }
                        });
                    }
                    return p;
                }
            };
            var oldLocate = System.locate;
            System.locate = function (load) {
                var parsedModuleName = utils.moduleName.parse(load.name), loader = this;
                var pmn = load.metadata.parsedModuleName = parsedModuleName;
                load.metadata.npmPackage = utils.pkg.findByNameAndVersion(this, pmn.packageName, pmn.version);
                if (parsedModuleName.version && this.npm && !loader.paths[load.name]) {
                    var pkg = this.npm[utils.moduleName.nameAndVersion(parsedModuleName)];
                    if (pkg) {
                        return oldLocate.call(this, load).then(function (locatedAddress) {
                            var address = locatedAddress;
                            var expectedAddress = utils.path.joinURIs(System.baseURL, load.name);
                            if (isBrowser) {
                                expectedAddress = expectedAddress.replace(/#/g, '%23');
                            }
                            if (address !== expectedAddress + '.js' && address !== expectedAddress) {
                                return address;
                            }
                            var root = utils.pkg.rootDir(pkg, utils.pkg.isRoot(loader, pkg));
                            if (parsedModuleName.modulePath) {
                                var npmAddress = utils.path.joinURIs(utils.path.addEndingSlash(root), parsedModuleName.plugin ? parsedModuleName.modulePath : utils.path.addJS(parsedModuleName.modulePath));
                                address = typeof steal !== 'undefined' ? utils.path.joinURIs(loader.baseURL, npmAddress) : npmAddress;
                            }
                            return address;
                        });
                    }
                }
                return oldLocate.call(this, load);
            };
            var oldFetch = System.fetch;
            System.fetch = function (load) {
                if (load.metadata.dryRun) {
                    return oldFetch.apply(this, arguments);
                }
                var loader = this;
                var context = loader.npmContext;
                var fetchPromise = Promise.resolve(oldFetch.apply(this, arguments));
                if (utils.moduleName.isNpm(load.name)) {
                    fetchPromise = fetchPromise.then(null, function (err) {
                        var statusCode = err.statusCode;
                        if (statusCode !== 404 && statusCode !== 0) {
                            return Promise.reject(err);
                        }
                        if (!loader.npmContext) {
                            loader.npmContext = { forwardSlashMap: {} };
                        }
                        var types = [].slice.call(retryTypes);
                        return retryAll(types, err).then(null, function (e) {
                            return Promise.reject(err);
                        });
                        function retryAll(types, err) {
                            if (!types.length) {
                                throw err;
                            }
                            var type = types.shift();
                            if (!type.test(load)) {
                                throw err;
                            }
                            return Promise.resolve(retryFetch.call(loader, load, type)).then(null, function (err) {
                                return retryAll(types, err);
                            });
                        }
                    });
                }
                return fetchPromise.catch(function (error) {
                    var statusCode = error.statusCode;
                    if ((statusCode === 404 || statusCode === 0) && utils.moduleName.isBareIdentifier(load.name) && !utils.pkg.isRoot(loader, load.metadata.npmPackage)) {
                        var newError = new Error([
                            'Could not load \'' + load.name + '\'',
                            'Is this an npm module not saved in your package.json?'
                        ].join('\n'));
                        newError.statusCode = error.statusCode;
                        throw newError;
                    } else {
                        throw error;
                    }
                });
            };
            var convertName = function (loader, name) {
                var pkg = utils.pkg.findByName(loader, name.split('/')[0]);
                if (pkg) {
                    var parsed = utils.moduleName.parse(name, pkg.name);
                    parsed.version = pkg.version;
                    if (!parsed.modulePath) {
                        parsed.modulePath = utils.pkg.main(pkg);
                    }
                    return utils.moduleName.create(parsed);
                }
                return name;
            };
            var configSpecial = {
                map: function (map) {
                    var newMap = {}, val;
                    for (var name in map) {
                        val = map[name];
                        newMap[convertName(this, name)] = typeof val === 'object' ? configSpecial.map(val) : convertName(this, val);
                    }
                    return newMap;
                },
                meta: function (map) {
                    var newMap = {};
                    for (var name in map) {
                        newMap[convertName(this, name)] = map[name];
                    }
                    return newMap;
                },
                paths: function (paths) {
                    var newPaths = {};
                    for (var name in paths) {
                        newPaths[convertName(this, name)] = paths[name];
                    }
                    return newPaths;
                }
            };
            var oldConfig = System.config;
            System.config = function (cfg) {
                var loader = this;
                if (loader.npmContext) {
                    var context = loader.npmContext;
                    var pkg = context.versions.__default;
                    var conv = context.convert.steal(context, pkg, cfg, true);
                    context.convert.updateConfigOnPackageLoad(conv, false, true, context.applyBuildConfig);
                    oldConfig.apply(loader, arguments);
                    return;
                }
                for (var name in cfg) {
                    if (configSpecial[name]) {
                        cfg[name] = configSpecial[name].call(loader, cfg[name]);
                    }
                }
                oldConfig.apply(loader, arguments);
            };
            var newLoader = System._newLoader || Function.prototype;
            System._newLoader = function (loader) {
                loader.npmContext = this.npmContext;
                loader.npmParentMap = this.npmParentMap;
                return newLoader.apply(this, arguments);
            };
            steal.addNpmPackages = function (npmPackages) {
                var packages = npmPackages || [];
                var loader = this.loader;
                for (var i = 0; i < packages.length; i += 1) {
                    var pkg = packages[i];
                    var path = pkg && pkg.fileUrl;
                    if (path) {
                        loader.npmContext.paths[path] = pkg;
                    }
                }
            };
            steal.getNpmPackages = function () {
                var context = this.loader.npmContext;
                return context ? context.packages || [] : [];
            };
            function retryFetch(load, type) {
                var loader = this;
                var moduleName = typeof type.name === 'function' ? type.name(loader, load) : load.name + type.name;
                var local = utils.extend({}, load);
                local.name = moduleName;
                local.metadata = { dryRun: true };
                return Promise.resolve(loader.locate(local)).then(function (address) {
                    local.address = address;
                    return loader.fetch(local);
                }).then(function (source) {
                    load.metadata.address = local.address;
                    loader.npmParentMap[load.name] = local.name;
                    var npmLoad = loader.npmContext && loader.npmContext.npmLoad;
                    if (npmLoad) {
                        npmLoad.saveLoadIfNeeded(loader.npmContext);
                        if (!isNode) {
                            utils.warnOnce('Some 404s were encountered ' + 'while loading. Don\'t panic! ' + 'These will only happen in dev ' + 'and are harmless.');
                        }
                    }
                    return source;
                });
            }
            var retryTypes = [
                {
                    name: function (loader, load) {
                        var context = loader.npmContext;
                        if (context.forwardSlashMap[load.name]) {
                            var parts = load.name.split('/');
                            parts.pop();
                            return parts.concat(['index']).join('/');
                        }
                        return load.name + '/index';
                    },
                    test: function () {
                        return true;
                    }
                },
                {
                    name: '.json',
                    test: function (load) {
                        return utils.moduleName.isNpm(load.name) && utils.path.basename(load.address) === 'package.js';
                    }
                }
            ];
        };
    }(function () {
        return this;
    }(), require, exports, module));
});
/*npm-load*/
define('npm-load', [], function(){ return {}; });
/*semver*/
define('semver', [], function(){ return {}; });
/*npm-crawl*/
define('npm-crawl', [], function(){ return {}; });
/*npm-convert*/
define('npm-convert', [], function(){ return {}; });
/*npm*/
define('npm', [], function(){ return {}; });
/*package.json!npm*/
define('package.json!npm', [
    '@loader',
    'npm-extension',
    'module'
], function (loader, npmExtension, module) {
    npmExtension.addExtension(loader);
    if (!loader.main) {
        loader.main = 'authentication@1.0.0#main';
    }
    loader._npmExtensions = [].slice.call(arguments, 2);
    (function (loader, packages, options) {
        var g = loader.global;
        if (!g.process) {
            g.process = {
                argv: [],
                cwd: function () {
                    var baseURL = loader.baseURL;
                    return baseURL;
                },
                browser: true,
                env: { NODE_ENV: loader.env },
                version: '',
                platform: navigator && navigator.userAgent && /Windows/.test(navigator.userAgent) ? 'win' : ''
            };
        }
        if (!loader.npm) {
            loader.npm = {};
            loader.npmPaths = {};
            loader.globalBrowser = {};
        }
        if (!loader.npmParentMap) {
            loader.npmParentMap = options.npmParentMap || {};
        }
        var rootPkg = loader.npmPaths.__default = packages[0];
        var rootConfig = rootPkg.steal || rootPkg.system;
        var lib = rootConfig && rootConfig.directories && rootConfig.directories.lib;
        var setGlobalBrowser = function (globals, pkg) {
            for (var name in globals) {
                loader.globalBrowser[name] = {
                    pkg: pkg,
                    moduleName: globals[name]
                };
            }
        };
        var setInNpm = function (name, pkg) {
            if (!loader.npm[name]) {
                loader.npm[name] = pkg;
            }
            loader.npm[name + '@' + pkg.version] = pkg;
        };
        var forEach = function (arr, fn) {
            var i = 0, len = arr.length;
            for (; i < len; i++) {
                res = fn.call(arr, arr[i], i);
                if (res === false)
                    break;
            }
        };
        var setupLiveReload = function () {
            if (loader.liveReloadInstalled) {
                loader['import']('live-reload', { name: module.id }).then(function (reload) {
                    reload.dispose(function () {
                        var pkgInfo = loader.npmContext.pkgInfo;
                        delete pkgInfo[rootPkg.name + '@' + rootPkg.version];
                        var idx = -1;
                        forEach(pkgInfo, function (pkg, i) {
                            if (pkg.name === rootPkg.name && pkg.version === rootPkg.version) {
                                idx = i;
                                return false;
                            }
                        });
                        pkgInfo.splice(idx, 1);
                    });
                });
            }
        };
        var ignoredConfig = [
            'bundle',
            'configDependencies',
            'transpiler',
            'treeShaking'
        ];
        packages.reverse();
        forEach(packages, function (pkg) {
            var steal = pkg.steal || pkg.system;
            if (steal) {
                var main = steal.main;
                delete steal.main;
                var configDeps = steal.configDependencies;
                if (pkg !== rootPkg) {
                    forEach(ignoredConfig, function (name) {
                        delete steal[name];
                    });
                }
                loader.config(steal);
                if (pkg === rootPkg) {
                    steal.configDependencies = configDeps;
                }
                steal.main = main;
            }
            if (pkg.globalBrowser) {
                var doNotApplyGlobalBrowser = pkg.name === 'steal' && rootConfig.builtins === false;
                if (!doNotApplyGlobalBrowser) {
                    setGlobalBrowser(pkg.globalBrowser, pkg);
                }
            }
            var systemName = steal && steal.name;
            if (systemName) {
                setInNpm(systemName, pkg);
            } else {
                setInNpm(pkg.name, pkg);
            }
            if (!loader.npm[pkg.name]) {
                loader.npm[pkg.name] = pkg;
            }
            loader.npm[pkg.name + '@' + pkg.version] = pkg;
            var pkgAddress = pkg.fileUrl.replace(/\/package\.json.*/, '');
            loader.npmPaths[pkgAddress] = pkg;
        });
        setupLiveReload();
        forEach(loader._npmExtensions || [], function (ext) {
            if (ext.systemConfig) {
                loader.config(ext.systemConfig);
            }
        });
    }(loader, [
        {
            'name': 'authentication',
            'version': '1.0.0',
            'fileUrl': './package.json',
            'main': 'main.js',
            'steal': {
                'plugins': [
                    'steal-css',
                    'steal-less',
                    'steal-stache',
                    'steal-tools'
                ],
                'paths': { 'css': './css/*' },
                'npmAlgorithm': 'flat'
            },
            'resolutions': {
                'authentication': '1.0.0',
                'steal-stache': '4.1.2',
                'jquery': '3.3.1',
                'backbone': '1.3.3',
                'can-view-import': '4.2.0',
                'can-stache-bindings': '4.5.0',
                'can-stache': '4.15.1'
            }
        },
        {
            'name': 'steal-stache',
            'version': '4.1.2',
            'fileUrl': './node_modules/steal-stache/package.json',
            'main': 'steal-stache.js',
            'steal': {
                'main': 'steal-stache',
                'configDependencies': ['live-reload'],
                'npmIgnore': {
                    'documentjs': true,
                    'testee': true,
                    'steal-tools': true
                },
                'npmAlgorithm': 'flat',
                'ext': { 'stache': 'steal-stache' }
            },
            'resolutions': {
                'can-stache-bindings': '4.5.0',
                'can-view-import': '4.2.0'
            }
        },
        {
            'name': 'steal-less',
            'version': '1.3.4',
            'fileUrl': './node_modules/steal-less/package.json',
            'main': 'less.js',
            'steal': {
                'plugins': ['steal-css'],
                'envs': {
                    'build': { 'map': { 'steal-less/less-engine': 'steal-less/less-engine-node' } },
                    'server-development': { 'map': { 'steal-less/less-engine': 'steal-less/less-engine-node' } },
                    'server-production': { 'map': { 'steal-less/less-engine': 'steal-less/less-engine-node' } },
                    'bundle-build': {
                        'map': { 'steal-less/less-engine': 'steal-less/less-engine-node' },
                        'meta': { 'steal-less/less': { 'useLocalDeps': true } }
                    }
                },
                'ext': { 'less': 'steal-less' },
                'meta': {}
            },
            'resolutions': {}
        },
        {
            'name': 'steal',
            'version': '2.1.6',
            'fileUrl': './node_modules/steal/package.json',
            'main': 'main',
            'steal': {
                'npmDependencies': {
                    'console-browserify': true,
                    'constants-browserify': true,
                    'crypto-browserify': true,
                    'http-browserify': true,
                    'buffer': true,
                    'os-browserify': true,
                    'vm-browserify': true,
                    'zlib-browserify': true,
                    'assert': true,
                    'domain-browser': true,
                    'events': true,
                    'https-browserify': true,
                    'path-browserify': true,
                    'string_decoder': true,
                    'tty-browserify': true,
                    'process': true,
                    'punycode': true
                }
            },
            'globalBrowser': {
                'console': 'console-browserify',
                'constants': 'constants-browserify',
                'crypto': 'crypto-browserify',
                'http': 'http-browserify',
                'buffer': 'buffer',
                'os': 'os-browserify',
                'vm': 'vm-browserify',
                'zlib': 'zlib-browserify',
                'assert': 'assert',
                'child_process': 'steal#ext/builtin/child_process',
                'cluster': 'steal#ext/builtin/cluster',
                'dgram': 'steal#ext/builtin/dgram',
                'dns': 'steal#ext/builtin/dns',
                'domain': 'domain-browser',
                'events': 'events',
                'fs': 'steal#ext/builtin/fs',
                'https': 'https-browserify',
                'module': 'steal#ext/builtin/module',
                'net': 'steal#ext/builtin/net',
                'path': 'path-browserify',
                'process': 'process',
                'querystring': 'steal#ext/builtin/querystring',
                'readline': 'steal#ext/builtin/readline',
                'repl': 'steal#ext/builtin/repl',
                'stream': 'steal#ext/builtin/stream',
                'string_decoder': 'string_decoder',
                'sys': 'steal#ext/builtin/sys',
                'timers': 'steal#ext/builtin/timers',
                'tls': 'steal#ext/builtin/tls',
                'tty': 'tty-browserify',
                'url': 'steal#ext/builtin/url',
                'util': 'steal#ext/builtin/util',
                '_stream_readable': 'steal#ext/builtin/_stream_readable',
                '_stream_writable': 'steal#ext/builtin/_stream_writable',
                '_stream_duplex': 'steal#ext/builtin/_stream_duplex',
                '_stream_transform': 'steal#ext/builtin/_stream_transform',
                '_stream_passthrough': 'steal#ext/builtin/_stream_passthrough'
            },
            'resolutions': {}
        },
        {
            'name': 'assert',
            'version': '1.4.1',
            'fileUrl': './node_modules/assert/package.json',
            'main': './assert.js',
            'resolutions': {}
        },
        {
            'name': 'steal-css',
            'version': '1.3.2',
            'fileUrl': './node_modules/steal-css/package.json',
            'main': 'css.js',
            'steal': {
                'ext': { 'css': 'steal-css' },
                'map': { '$css': 'steal-css@1.3.2#css' }
            },
            'resolutions': {}
        },
        {
            'name': 'buffer',
            'version': '5.0.8',
            'fileUrl': './node_modules/buffer/package.json',
            'main': 'index.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'console-browserify',
            'version': '1.1.0',
            'fileUrl': './node_modules/console-browserify/package.json',
            'main': 'index',
            'resolutions': {}
        },
        {
            'name': 'crypto-browserify',
            'version': '3.11.1',
            'fileUrl': './node_modules/crypto-browserify/package.json',
            'browser': { 'crypto': '@empty' },
            'resolutions': {}
        },
        {
            'name': 'constants-browserify',
            'version': '1.0.0',
            'fileUrl': './node_modules/constants-browserify/package.json',
            'main': 'constants.json',
            'resolutions': {}
        },
        {
            'name': 'domain-browser',
            'version': '1.1.7',
            'fileUrl': './node_modules/domain-browser/package.json',
            'main': './index.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'events',
            'version': '1.1.1',
            'fileUrl': './node_modules/events/package.json',
            'main': './events.js',
            'resolutions': {}
        },
        {
            'name': 'http-browserify',
            'version': '1.7.0',
            'fileUrl': './node_modules/http-browserify/package.json',
            'main': 'index.js',
            'browser': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'https-browserify',
            'version': '1.0.0',
            'fileUrl': './node_modules/https-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'os-browserify',
            'version': '0.3.0',
            'fileUrl': './node_modules/os-browserify/package.json',
            'main': 'main.js',
            'browser': 'browser.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'path-browserify',
            'version': '0.0.1',
            'fileUrl': './node_modules/path-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'process',
            'version': '0.11.10',
            'fileUrl': './node_modules/process/package.json',
            'main': './index.js',
            'browser': './browser.js',
            'resolutions': {}
        },
        {
            'name': 'punycode',
            'version': '2.0.1',
            'fileUrl': './node_modules/punycode/package.json',
            'main': 'punycode.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'string_decoder',
            'version': '1.0.3',
            'fileUrl': './node_modules/string_decoder/package.json',
            'main': 'lib/string_decoder.js',
            'resolutions': {}
        },
        {
            'name': 'tty-browserify',
            'version': '0.0.1',
            'fileUrl': './node_modules/tty-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'vm-browserify',
            'version': '0.0.4',
            'fileUrl': './node_modules/vm-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'zlib-browserify',
            'version': '0.0.3',
            'fileUrl': './node_modules/zlib-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'jquery',
            'version': '3.3.1',
            'fileUrl': './node_modules/jquery/package.json',
            'main': 'dist/jquery.js',
            'resolutions': {}
        },
        {
            'name': 'backbone',
            'version': '1.3.3',
            'fileUrl': './node_modules/backbone/package.json',
            'main': 'backbone.js',
            'resolutions': {
                'jquery': '3.3.1',
                'underscore': '1.9.1'
            }
        },
        {
            'name': 'can-stache-ast',
            'version': '1.1.0',
            'fileUrl': './node_modules/can-stache-ast/package.json',
            'main': 'can-stache-ast.js',
            'resolutions': {
                'can-stache-ast': '1.1.0',
                'can-view-parser': '4.1.1'
            }
        },
        {
            'name': 'underscore',
            'version': '1.9.1',
            'fileUrl': './node_modules/underscore/package.json',
            'main': 'underscore.js',
            'resolutions': {}
        },
        {
            'name': 'steal-config-utils',
            'version': '1.0.0',
            'fileUrl': './node_modules/steal-config-utils/package.json',
            'main': 'main.js',
            'resolutions': {}
        },
        {
            'name': 'can-view-parser',
            'version': '4.1.1',
            'fileUrl': './node_modules/can-view-parser/package.json',
            'main': 'can-view-parser',
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-log': '1.0.0',
                'can-attribute-encoder': '1.1.0'
            }
        },
        {
            'name': 'can-namespace',
            'version': '1.0.0',
            'fileUrl': './node_modules/can-namespace/package.json',
            'main': 'can-namespace',
            'steal': { 'npmAlgorithm': 'flat' },
            'resolutions': {}
        },
        {
            'name': 'can-log',
            'version': '1.0.0',
            'fileUrl': './node_modules/can-log/package.json',
            'main': 'dist/cjs/can-log',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-log'
            },
            'resolutions': { 'can-log': '1.0.0' }
        },
        {
            'name': 'can-attribute-encoder',
            'version': '1.1.0',
            'fileUrl': './node_modules/can-attribute-encoder/package.json',
            'main': 'can-attribute-encoder',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'steal-tools': true
                },
                'main': 'can-attribute-encoder'
            },
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-log': '1.0.0'
            }
        },
        {
            'name': 'can-stache-bindings',
            'version': '4.5.0',
            'fileUrl': './node_modules/can-stache-bindings/package.json',
            'main': 'can-stache-bindings',
            'steal': { 'main': 'can-stache-bindings' },
            'resolutions': {
                'can-stache': '4.15.1',
                'can-reflect': '1.17.6',
                'can-view-scope': '4.11.0',
                'can-dom-mutate': '1.2.2',
                'can-bind': '1.0.1',
                'can-view-model': '4.0.1',
                'can-stache-key': '1.4.0',
                'can-simple-observable': '2.4.0',
                'can-reflect-dependencies': '1.1.1',
                'can-queues': '1.1.4',
                'can-attribute-observable': '1.1.5',
                'can-view-callbacks': '4.3.1',
                'can-observation-recorder': '1.2.0',
                'can-assign': '1.3.1',
                'can-log': '1.0.0',
                'can-dom-data-state': '1.0.2',
                'can-symbol': '1.6.1',
                'can-attribute-encoder': '1.1.0',
                'can-view-nodelist': '4.3.2'
            }
        },
        {
            'name': 'can-view-import',
            'version': '4.2.0',
            'fileUrl': './node_modules/can-view-import/package.json',
            'main': 'can-view-import',
            'resolutions': {
                'can-view-callbacks': '4.3.1',
                'can-globals': '1.2.0',
                'can-assign': '1.3.1',
                'can-symbol': '1.6.1',
                'can-view-nodelist': '4.3.2',
                'can-dom-mutate': '1.2.2',
                'can-dom-data-state': '1.0.2',
                'can-child-nodes': '1.2.0',
                'can-import-module': '1.2.0',
                'can-log': '1.0.0'
            }
        },
        {
            'name': 'can-stache',
            'version': '4.15.1',
            'fileUrl': './node_modules/can-stache/package.json',
            'main': 'can-stache',
            'resolutions': {
                'can-stache': '4.15.1',
                'can-namespace': '1.0.0',
                'can-view-callbacks': '4.3.1',
                'can-view-parser': '4.1.1',
                'can-stache-ast': '1.1.0',
                'can-attribute-encoder': '1.1.0',
                'can-log': '1.0.0',
                'can-globals': '1.2.0',
                'can-assign': '1.3.1',
                'can-reflect': '1.17.6',
                'can-view-scope': '4.11.0',
                'can-observation-recorder': '1.2.0',
                'can-import-module': '1.2.0',
                'can-symbol': '1.6.1',
                'can-view-target': '4.1.0',
                'can-view-nodelist': '4.3.2',
                'can-view-live': '4.2.6',
                'can-observation': '4.1.1',
                'can-fragment': '1.3.0',
                'can-dom-mutate': '1.2.2',
                'can-define-lazy-value': '1.1.0',
                'can-dom-data-state': '1.0.2',
                'can-stache-key': '1.4.0',
                'can-join-uris': '1.2.0',
                'can-stache-helpers': '1.2.0',
                'can-dom-data': '1.0.1',
                'can-simple-observable': '2.4.0'
            }
        },
        {
            'name': 'can-view-callbacks',
            'version': '4.3.1',
            'fileUrl': './node_modules/can-view-callbacks/package.json',
            'main': 'can-view-callbacks',
            'resolutions': {
                'can-observation-recorder': '1.2.0',
                'can-log': '1.0.0',
                'can-globals': '1.2.0',
                'can-dom-mutate': '1.2.2',
                'can-namespace': '1.0.0',
                'can-view-nodelist': '4.3.2',
                'can-fragment': '1.3.0',
                'can-symbol': '1.6.1',
                'can-reflect': '1.17.6'
            }
        },
        {
            'name': 'can-globals',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-globals/package.json',
            'main': 'can-globals.js',
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0',
                'can-reflect': '1.17.6'
            }
        },
        {
            'name': 'can-assign',
            'version': '1.3.1',
            'fileUrl': './node_modules/can-assign/package.json',
            'main': 'dist/cjs/can-assign',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-assign'
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-reflect',
            'version': '1.17.6',
            'fileUrl': './node_modules/can-reflect/package.json',
            'main': 'can-reflect',
            'resolutions': {
                'can-reflect': '1.17.6',
                'can-namespace': '1.0.0',
                'can-symbol': '1.6.1'
            }
        },
        {
            'name': 'can-view-scope',
            'version': '4.11.0',
            'fileUrl': './node_modules/can-view-scope/package.json',
            'main': 'can-view-scope',
            'resolutions': {
                'can-stache-key': '1.4.0',
                'can-observation-recorder': '1.2.0',
                'can-view-scope': '4.11.0',
                'can-assign': '1.3.1',
                'can-namespace': '1.0.0',
                'can-reflect': '1.17.6',
                'can-log': '1.0.0',
                'can-define-lazy-value': '1.1.0',
                'can-simple-map': '4.3.0',
                'can-stache-helpers': '1.2.0',
                'can-single-reference': '1.2.0',
                'can-observation': '4.1.1',
                'can-symbol': '1.6.1',
                'can-reflect-dependencies': '1.1.1',
                'can-event-queue': '1.1.3',
                'can-simple-observable': '2.4.0'
            }
        },
        {
            'name': 'can-observation-recorder',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-observation-recorder/package.json',
            'main': './can-observation-recorder.js',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                }
            },
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-symbol': '1.6.1'
            }
        },
        {
            'name': 'can-import-module',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-import-module/package.json',
            'main': 'can-import-module.js',
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0'
            }
        },
        {
            'name': 'can-symbol',
            'version': '1.6.1',
            'fileUrl': './node_modules/can-symbol/package.json',
            'main': 'can-symbol',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-symbol'
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-view-target',
            'version': '4.1.0',
            'fileUrl': './node_modules/can-view-target/package.json',
            'main': 'can-view-target',
            'resolutions': {
                'can-globals': '1.2.0',
                'can-dom-mutate': '1.2.2',
                'can-namespace': '1.0.0'
            }
        },
        {
            'name': 'can-view-nodelist',
            'version': '4.3.2',
            'fileUrl': './node_modules/can-view-nodelist/package.json',
            'main': 'can-view-nodelist',
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-dom-mutate': '1.2.2'
            }
        },
        {
            'name': 'can-view-live',
            'version': '4.2.6',
            'fileUrl': './node_modules/can-view-live/package.json',
            'main': 'can-view-live',
            'steal': {
                'npmIgnore': {
                    'documentjs': true,
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-view-live'
            },
            'resolutions': {
                'can-view-live': '4.2.6',
                'can-view-parser': '4.1.1',
                'can-dom-mutate': '1.2.2',
                'can-view-nodelist': '4.3.2',
                'can-fragment': '1.3.0',
                'can-child-nodes': '1.2.0',
                'can-reflect': '1.17.6',
                'can-reflect-dependencies': '1.1.1',
                'can-queues': '1.1.4',
                'can-attribute-observable': '1.1.5',
                'can-view-callbacks': '4.3.1',
                'can-symbol': '1.6.1',
                'can-simple-observable': '2.4.0',
                'can-diff': '1.4.2'
            }
        },
        {
            'name': 'can-observation',
            'version': '4.1.1',
            'fileUrl': './node_modules/can-observation/package.json',
            'main': 'can-observation',
            'steal': { 'npmAlgorithm': 'flat' },
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-reflect': '1.17.6',
                'can-queues': '1.1.4',
                'can-observation-recorder': '1.2.0',
                'can-symbol': '1.6.1',
                'can-log': '1.0.0',
                'can-observation': '4.1.1',
                'can-event-queue': '1.1.3'
            }
        },
        {
            'name': 'can-fragment',
            'version': '1.3.0',
            'fileUrl': './node_modules/can-fragment/package.json',
            'main': 'can-fragment',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                }
            },
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0',
                'can-reflect': '1.17.6',
                'can-child-nodes': '1.2.0',
                'can-symbol': '1.6.1'
            }
        },
        {
            'name': 'can-dom-mutate',
            'version': '1.2.2',
            'fileUrl': './node_modules/can-dom-mutate/package.json',
            'main': 'can-dom-mutate',
            'steal': { 'main': 'can-dom-mutate' },
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0',
                'can-dom-mutate': '1.2.2'
            }
        },
        {
            'name': 'can-define-lazy-value',
            'version': '1.1.0',
            'fileUrl': './node_modules/can-define-lazy-value/package.json',
            'main': 'define-lazy-value',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'steal-tools': true
                }
            },
            'resolutions': {}
        },
        {
            'name': 'can-dom-data-state',
            'version': '1.0.2',
            'fileUrl': './node_modules/can-dom-data-state/package.json',
            'main': 'can-dom-data-state.js',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-dom-data-state'
            },
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-dom-mutate': '1.2.2',
                'can-cid': '1.3.0'
            }
        },
        {
            'name': 'can-child-nodes',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-child-nodes/package.json',
            'main': 'can-child-nodes',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                }
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-bind',
            'version': '1.0.1',
            'fileUrl': './node_modules/can-bind/package.json',
            'main': 'can-bind',
            'steal': {
                'npmIgnore': {
                    'steal-tools': true,
                    'testee': true
                },
                'main': 'can-bind'
            },
            'resolutions': {
                'can-reflect': '1.17.6',
                'can-symbol': '1.6.1',
                'can-namespace': '1.0.0',
                'can-queues': '1.1.4',
                'can-assign': '1.3.1',
                'can-log': '1.0.0',
                'can-reflect-dependencies': '1.1.1'
            }
        },
        {
            'name': 'can-view-model',
            'version': '4.0.1',
            'fileUrl': './node_modules/can-view-model/package.json',
            'main': 'can-view-model',
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-globals': '1.2.0',
                'can-reflect': '1.17.6',
                'can-symbol': '1.6.1',
                'can-simple-map': '4.3.0'
            }
        },
        {
            'name': 'can-stache-key',
            'version': '1.4.0',
            'fileUrl': './node_modules/can-stache-key/package.json',
            'main': 'can-stache-key',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-stache-key'
            },
            'resolutions': {
                'can-observation-recorder': '1.2.0',
                'can-log': '1.0.0',
                'can-symbol': '1.6.1',
                'can-reflect': '1.17.6',
                'can-reflect-promise': '2.2.0'
            }
        },
        {
            'name': 'can-simple-observable',
            'version': '2.4.0',
            'fileUrl': './node_modules/can-simple-observable/package.json',
            'main': 'can-simple-observable',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'steal-tools': true
                }
            },
            'resolutions': {
                'can-simple-observable': '2.4.0',
                'can-namespace': '1.0.0',
                'can-symbol': '1.6.1',
                'can-reflect': '1.17.6',
                'can-observation-recorder': '1.2.0',
                'can-observation': '4.1.1',
                'can-event-queue': '1.1.3',
                'can-queues': '1.1.4',
                'can-log': '1.0.0'
            }
        },
        {
            'name': 'can-reflect-dependencies',
            'version': '1.1.1',
            'fileUrl': './node_modules/can-reflect-dependencies/package.json',
            'main': 'can-reflect-dependencies.js',
            'resolutions': {
                'can-reflect-dependencies': '1.1.1',
                'can-reflect': '1.17.6',
                'can-symbol': '1.6.1',
                'can-assign': '1.3.1'
            }
        },
        {
            'name': 'can-queues',
            'version': '1.1.4',
            'fileUrl': './node_modules/can-queues/package.json',
            'main': './can-queues.js',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-queues'
            },
            'resolutions': {
                'can-log': '1.0.0',
                'can-queues': '1.1.4',
                'can-namespace': '1.0.0',
                'can-assign': '1.3.1'
            }
        },
        {
            'name': 'can-attribute-observable',
            'version': '1.1.5',
            'fileUrl': './node_modules/can-attribute-observable/package.json',
            'main': 'can-attribute-observable',
            'resolutions': {
                'can-queues': '1.1.4',
                'can-attribute-observable': '1.1.5',
                'can-reflect': '1.17.6',
                'can-observation': '4.1.1',
                'can-reflect-dependencies': '1.1.1',
                'can-observation-recorder': '1.2.0',
                'can-simple-observable': '2.4.0',
                'can-dom-events': '1.3.2',
                'can-event-dom-radiochange': '2.2.0',
                'can-globals': '1.2.0',
                'can-dom-data-state': '1.0.2',
                'can-dom-mutate': '1.2.2',
                'can-diff': '1.4.2'
            }
        },
        {
            'name': 'can-join-uris',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-join-uris/package.json',
            'main': 'can-join-uris',
            'steal': {},
            'resolutions': {
                'can-namespace': '1.0.0',
                'can-parse-uri': '1.2.0'
            }
        },
        {
            'name': 'can-stache-helpers',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-stache-helpers/package.json',
            'main': 'can-stache-helpers',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                }
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-dom-data',
            'version': '1.0.1',
            'fileUrl': './node_modules/can-dom-data/package.json',
            'main': 'can-dom-data.js',
            'steal': {
                'npmIgnore': {
                    'steal-tools': true,
                    'testee': true
                },
                'main': 'can-dom-data'
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-simple-map',
            'version': '4.3.0',
            'fileUrl': './node_modules/can-simple-map/package.json',
            'main': 'can-simple-map',
            'steal': {
                'npmIgnore': {
                    'documentjs': true,
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-simple-map'
            },
            'resolutions': {
                'can-event-queue': '1.1.3',
                'can-queues': '1.1.4',
                'can-observation-recorder': '1.2.0',
                'can-reflect': '1.17.6',
                'can-log': '1.0.0',
                'can-symbol': '1.6.1',
                'can-construct': '3.5.3'
            }
        },
        {
            'name': 'can-event-queue',
            'version': '1.1.3',
            'fileUrl': './node_modules/can-event-queue/package.json',
            'main': './can-event-queue.js',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'plugins': [
                    'steal-less',
                    'steal-stache'
                ]
            },
            'resolutions': {
                'can-queues': '1.1.4',
                'can-reflect': '1.17.6',
                'can-define-lazy-value': '1.1.0',
                'can-event-queue': '1.1.3',
                'can-key-tree': '1.2.0',
                'can-log': '1.0.0',
                'can-symbol': '1.6.1',
                'can-dom-events': '1.3.2'
            }
        },
        {
            'name': 'can-cid',
            'version': '1.3.0',
            'fileUrl': './node_modules/can-cid/package.json',
            'main': 'can-cid',
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-reflect-promise',
            'version': '2.2.0',
            'fileUrl': './node_modules/can-reflect-promise/package.json',
            'main': 'can-reflect-promise',
            'steal': { 'npmAlgorithm': 'flat' },
            'resolutions': {
                'can-reflect': '1.17.6',
                'can-symbol': '1.6.1',
                'can-observation-recorder': '1.2.0',
                'can-queues': '1.1.4',
                'can-log': '1.0.0',
                'can-key-tree': '1.2.0'
            }
        },
        {
            'name': 'can-dom-events',
            'version': '1.3.2',
            'fileUrl': './node_modules/can-dom-events/package.json',
            'main': 'can-dom-events',
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0',
                'can-dom-events': '1.3.2',
                'can-key-tree': '1.2.0',
                'can-reflect': '1.17.6'
            }
        },
        {
            'name': 'can-event-dom-radiochange',
            'version': '2.2.0',
            'fileUrl': './node_modules/can-event-dom-radiochange/package.json',
            'main': 'can-event-dom-radiochange',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'steal-tools': true
                },
                'main': 'can-event-dom-radiochange'
            },
            'resolutions': {
                'can-globals': '1.2.0',
                'can-namespace': '1.0.0'
            }
        },
        {
            'name': 'can-single-reference',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-single-reference/package.json',
            'main': 'can-single-reference',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                }
            },
            'resolutions': { 'can-cid': '1.3.0' }
        },
        {
            'name': 'can-diff',
            'version': '1.4.2',
            'fileUrl': './node_modules/can-diff/package.json',
            'main': 'can-diff',
            'steal': { 'main': 'can-diff' },
            'resolutions': {
                'can-reflect': '1.17.6',
                'can-symbol': '1.6.1',
                'can-diff': '1.4.2',
                'can-queues': '1.1.4',
                'can-key-tree': '1.2.0'
            }
        },
        {
            'name': 'can-parse-uri',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-parse-uri/package.json',
            'main': 'can-parse-uri',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'main': 'can-parse-uri'
            },
            'resolutions': { 'can-namespace': '1.0.0' }
        },
        {
            'name': 'can-construct',
            'version': '3.5.3',
            'fileUrl': './node_modules/can-construct/package.json',
            'main': 'can-construct',
            'steal': {},
            'resolutions': {
                'can-reflect': '1.17.6',
                'can-log': '1.0.0',
                'can-namespace': '1.0.0',
                'can-string': '1.0.0'
            }
        },
        {
            'name': 'can-key-tree',
            'version': '1.2.0',
            'fileUrl': './node_modules/can-key-tree/package.json',
            'main': 'dist/cjs/can-key-tree',
            'steal': {
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'plugins': [
                    'steal-less',
                    'steal-stache'
                ],
                'main': 'can-key-tree'
            },
            'resolutions': { 'can-reflect': '1.17.6' }
        },
        {
            'name': 'can-string',
            'version': '1.0.0',
            'fileUrl': './node_modules/can-string/package.json',
            'main': 'can-string',
            'steal': {
                'configDependencies': ['live-reload'],
                'npmIgnore': {
                    'testee': true,
                    'generator-donejs': true,
                    'donejs-cli': true,
                    'steal-tools': true
                },
                'plugins': [
                    'steal-less',
                    'steal-stache'
                ]
            },
            'resolutions': {}
        }
    ], { 'npmParentMap': {} }));
});
/*babel*/
define('babel', [], function(){ return {}; });
/*jquery@3.3.1#dist/jquery*/
(function (global, factory) {
    'use strict';
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = global.document ? factory(global, true) : function (w) {
            if (!w.document) {
                throw new Error('jQuery requires a window with a document');
            }
            return factory(w);
        };
    } else {
        factory(global);
    }
}(typeof window !== 'undefined' ? window : this, function (window, noGlobal) {
    'use strict';
    var arr = [];
    var document = window.document;
    var getProto = Object.getPrototypeOf;
    var slice = arr.slice;
    var concat = arr.concat;
    var push = arr.push;
    var indexOf = arr.indexOf;
    var class2type = {};
    var toString = class2type.toString;
    var hasOwn = class2type.hasOwnProperty;
    var fnToString = hasOwn.toString;
    var ObjectFunctionString = fnToString.call(Object);
    var support = {};
    var isFunction = function isFunction(obj) {
        return typeof obj === 'function' && typeof obj.nodeType !== 'number';
    };
    var isWindow = function isWindow(obj) {
        return obj != null && obj === obj.window;
    };
    var preservedScriptAttributes = {
        type: true,
        src: true,
        noModule: true
    };
    function DOMEval(code, doc, node) {
        doc = doc || document;
        var i, script = doc.createElement('script');
        script.text = code;
        if (node) {
            for (i in preservedScriptAttributes) {
                if (node[i]) {
                    script[i] = node[i];
                }
            }
        }
        doc.head.appendChild(script).parentNode.removeChild(script);
    }
    function toType(obj) {
        if (obj == null) {
            return obj + '';
        }
        return typeof obj === 'object' || typeof obj === 'function' ? class2type[toString.call(obj)] || 'object' : typeof obj;
    }
    var version = '3.3.1', jQuery = function (selector, context) {
            return new jQuery.fn.init(selector, context);
        }, rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
    jQuery.fn = jQuery.prototype = {
        jquery: version,
        constructor: jQuery,
        length: 0,
        toArray: function () {
            return slice.call(this);
        },
        get: function (num) {
            if (num == null) {
                return slice.call(this);
            }
            return num < 0 ? this[num + this.length] : this[num];
        },
        pushStack: function (elems) {
            var ret = jQuery.merge(this.constructor(), elems);
            ret.prevObject = this;
            return ret;
        },
        each: function (callback) {
            return jQuery.each(this, callback);
        },
        map: function (callback) {
            return this.pushStack(jQuery.map(this, function (elem, i) {
                return callback.call(elem, i, elem);
            }));
        },
        slice: function () {
            return this.pushStack(slice.apply(this, arguments));
        },
        first: function () {
            return this.eq(0);
        },
        last: function () {
            return this.eq(-1);
        },
        eq: function (i) {
            var len = this.length, j = +i + (i < 0 ? len : 0);
            return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
        },
        end: function () {
            return this.prevObject || this.constructor();
        },
        push: push,
        sort: arr.sort,
        splice: arr.splice
    };
    jQuery.extend = jQuery.fn.extend = function () {
        var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {}, i = 1, length = arguments.length, deep = false;
        if (typeof target === 'boolean') {
            deep = target;
            target = arguments[i] || {};
            i++;
        }
        if (typeof target !== 'object' && !isFunction(target)) {
            target = {};
        }
        if (i === length) {
            target = this;
            i--;
        }
        for (; i < length; i++) {
            if ((options = arguments[i]) != null) {
                for (name in options) {
                    src = target[name];
                    copy = options[name];
                    if (target === copy) {
                        continue;
                    }
                    if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];
                        } else {
                            clone = src && jQuery.isPlainObject(src) ? src : {};
                        }
                        target[name] = jQuery.extend(deep, clone, copy);
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }
        return target;
    };
    jQuery.extend({
        expando: 'jQuery' + (version + Math.random()).replace(/\D/g, ''),
        isReady: true,
        error: function (msg) {
            throw new Error(msg);
        },
        noop: function () {
        },
        isPlainObject: function (obj) {
            var proto, Ctor;
            if (!obj || toString.call(obj) !== '[object Object]') {
                return false;
            }
            proto = getProto(obj);
            if (!proto) {
                return true;
            }
            Ctor = hasOwn.call(proto, 'constructor') && proto.constructor;
            return typeof Ctor === 'function' && fnToString.call(Ctor) === ObjectFunctionString;
        },
        isEmptyObject: function (obj) {
            var name;
            for (name in obj) {
                return false;
            }
            return true;
        },
        globalEval: function (code) {
            DOMEval(code);
        },
        each: function (obj, callback) {
            var length, i = 0;
            if (isArrayLike(obj)) {
                length = obj.length;
                for (; i < length; i++) {
                    if (callback.call(obj[i], i, obj[i]) === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    if (callback.call(obj[i], i, obj[i]) === false) {
                        break;
                    }
                }
            }
            return obj;
        },
        trim: function (text) {
            return text == null ? '' : (text + '').replace(rtrim, '');
        },
        makeArray: function (arr, results) {
            var ret = results || [];
            if (arr != null) {
                if (isArrayLike(Object(arr))) {
                    jQuery.merge(ret, typeof arr === 'string' ? [arr] : arr);
                } else {
                    push.call(ret, arr);
                }
            }
            return ret;
        },
        inArray: function (elem, arr, i) {
            return arr == null ? -1 : indexOf.call(arr, elem, i);
        },
        merge: function (first, second) {
            var len = +second.length, j = 0, i = first.length;
            for (; j < len; j++) {
                first[i++] = second[j];
            }
            first.length = i;
            return first;
        },
        grep: function (elems, callback, invert) {
            var callbackInverse, matches = [], i = 0, length = elems.length, callbackExpect = !invert;
            for (; i < length; i++) {
                callbackInverse = !callback(elems[i], i);
                if (callbackInverse !== callbackExpect) {
                    matches.push(elems[i]);
                }
            }
            return matches;
        },
        map: function (elems, callback, arg) {
            var length, value, i = 0, ret = [];
            if (isArrayLike(elems)) {
                length = elems.length;
                for (; i < length; i++) {
                    value = callback(elems[i], i, arg);
                    if (value != null) {
                        ret.push(value);
                    }
                }
            } else {
                for (i in elems) {
                    value = callback(elems[i], i, arg);
                    if (value != null) {
                        ret.push(value);
                    }
                }
            }
            return concat.apply([], ret);
        },
        guid: 1,
        support: support
    });
    if (typeof Symbol === 'function') {
        jQuery.fn[Symbol.iterator] = arr[Symbol.iterator];
    }
    jQuery.each('Boolean Number String Function Array Date RegExp Object Error Symbol'.split(' '), function (i, name) {
        class2type['[object ' + name + ']'] = name.toLowerCase();
    });
    function isArrayLike(obj) {
        var length = !!obj && 'length' in obj && obj.length, type = toType(obj);
        if (isFunction(obj) || isWindow(obj)) {
            return false;
        }
        return type === 'array' || length === 0 || typeof length === 'number' && length > 0 && length - 1 in obj;
    }
    var Sizzle = function (window) {
        var i, support, Expr, getText, isXML, tokenize, compile, select, outermostContext, sortInput, hasDuplicate, setDocument, document, docElem, documentIsHTML, rbuggyQSA, rbuggyMatches, matches, contains, expando = 'sizzle' + 1 * new Date(), preferredDoc = window.document, dirruns = 0, done = 0, classCache = createCache(), tokenCache = createCache(), compilerCache = createCache(), sortOrder = function (a, b) {
                if (a === b) {
                    hasDuplicate = true;
                }
                return 0;
            }, hasOwn = {}.hasOwnProperty, arr = [], pop = arr.pop, push_native = arr.push, push = arr.push, slice = arr.slice, indexOf = function (list, elem) {
                var i = 0, len = list.length;
                for (; i < len; i++) {
                    if (list[i] === elem) {
                        return i;
                    }
                }
                return -1;
            }, booleans = 'checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped', whitespace = '[\\x20\\t\\r\\n\\f]', identifier = '(?:\\\\.|[\\w-]|[^\0-\\xa0])+', attributes = '\\[' + whitespace + '*(' + identifier + ')(?:' + whitespace + '*([*^$|!~]?=)' + whitespace + '*(?:\'((?:\\\\.|[^\\\\\'])*)\'|"((?:\\\\.|[^\\\\"])*)"|(' + identifier + '))|)' + whitespace + '*\\]', pseudos = ':(' + identifier + ')(?:\\((' + '(\'((?:\\\\.|[^\\\\\'])*)\'|"((?:\\\\.|[^\\\\"])*)")|' + '((?:\\\\.|[^\\\\()[\\]]|' + attributes + ')*)|' + '.*' + ')\\)|)', rwhitespace = new RegExp(whitespace + '+', 'g'), rtrim = new RegExp('^' + whitespace + '+|((?:^|[^\\\\])(?:\\\\.)*)' + whitespace + '+$', 'g'), rcomma = new RegExp('^' + whitespace + '*,' + whitespace + '*'), rcombinators = new RegExp('^' + whitespace + '*([>+~]|' + whitespace + ')' + whitespace + '*'), rattributeQuotes = new RegExp('=' + whitespace + '*([^\\]\'"]*?)' + whitespace + '*\\]', 'g'), rpseudo = new RegExp(pseudos), ridentifier = new RegExp('^' + identifier + '$'), matchExpr = {
                'ID': new RegExp('^#(' + identifier + ')'),
                'CLASS': new RegExp('^\\.(' + identifier + ')'),
                'TAG': new RegExp('^(' + identifier + '|[*])'),
                'ATTR': new RegExp('^' + attributes),
                'PSEUDO': new RegExp('^' + pseudos),
                'CHILD': new RegExp('^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(' + whitespace + '*(even|odd|(([+-]|)(\\d*)n|)' + whitespace + '*(?:([+-]|)' + whitespace + '*(\\d+)|))' + whitespace + '*\\)|)', 'i'),
                'bool': new RegExp('^(?:' + booleans + ')$', 'i'),
                'needsContext': new RegExp('^' + whitespace + '*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(' + whitespace + '*((?:-\\d)?\\d*)' + whitespace + '*\\)|)(?=[^-]|$)', 'i')
            }, rinputs = /^(?:input|select|textarea|button)$/i, rheader = /^h\d$/i, rnative = /^[^{]+\{\s*\[native \w/, rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/, rsibling = /[+~]/, runescape = new RegExp('\\\\([\\da-f]{1,6}' + whitespace + '?|(' + whitespace + ')|.)', 'ig'), funescape = function (_, escaped, escapedWhitespace) {
                var high = '0x' + escaped - 65536;
                return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 65536) : String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320);
            }, rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g, fcssescape = function (ch, asCodePoint) {
                if (asCodePoint) {
                    if (ch === '\0') {
                        return '\uFFFD';
                    }
                    return ch.slice(0, -1) + '\\' + ch.charCodeAt(ch.length - 1).toString(16) + ' ';
                }
                return '\\' + ch;
            }, unloadHandler = function () {
                setDocument();
            }, disabledAncestor = addCombinator(function (elem) {
                return elem.disabled === true && ('form' in elem || 'label' in elem);
            }, {
                dir: 'parentNode',
                next: 'legend'
            });
        try {
            push.apply(arr = slice.call(preferredDoc.childNodes), preferredDoc.childNodes);
            arr[preferredDoc.childNodes.length].nodeType;
        } catch (e) {
            push = {
                apply: arr.length ? function (target, els) {
                    push_native.apply(target, slice.call(els));
                } : function (target, els) {
                    var j = target.length, i = 0;
                    while (target[j++] = els[i++]) {
                    }
                    target.length = j - 1;
                }
            };
        }
        function Sizzle(selector, context, results, seed) {
            var m, i, elem, nid, match, groups, newSelector, newContext = context && context.ownerDocument, nodeType = context ? context.nodeType : 9;
            results = results || [];
            if (typeof selector !== 'string' || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
                return results;
            }
            if (!seed) {
                if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
                    setDocument(context);
                }
                context = context || document;
                if (documentIsHTML) {
                    if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
                        if (m = match[1]) {
                            if (nodeType === 9) {
                                if (elem = context.getElementById(m)) {
                                    if (elem.id === m) {
                                        results.push(elem);
                                        return results;
                                    }
                                } else {
                                    return results;
                                }
                            } else {
                                if (newContext && (elem = newContext.getElementById(m)) && contains(context, elem) && elem.id === m) {
                                    results.push(elem);
                                    return results;
                                }
                            }
                        } else if (match[2]) {
                            push.apply(results, context.getElementsByTagName(selector));
                            return results;
                        } else if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) {
                            push.apply(results, context.getElementsByClassName(m));
                            return results;
                        }
                    }
                    if (support.qsa && !compilerCache[selector + ' '] && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
                        if (nodeType !== 1) {
                            newContext = context;
                            newSelector = selector;
                        } else if (context.nodeName.toLowerCase() !== 'object') {
                            if (nid = context.getAttribute('id')) {
                                nid = nid.replace(rcssescape, fcssescape);
                            } else {
                                context.setAttribute('id', nid = expando);
                            }
                            groups = tokenize(selector);
                            i = groups.length;
                            while (i--) {
                                groups[i] = '#' + nid + ' ' + toSelector(groups[i]);
                            }
                            newSelector = groups.join(',');
                            newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
                        }
                        if (newSelector) {
                            try {
                                push.apply(results, newContext.querySelectorAll(newSelector));
                                return results;
                            } catch (qsaError) {
                            } finally {
                                if (nid === expando) {
                                    context.removeAttribute('id');
                                }
                            }
                        }
                    }
                }
            }
            return select(selector.replace(rtrim, '$1'), context, results, seed);
        }
        function createCache() {
            var keys = [];
            function cache(key, value) {
                if (keys.push(key + ' ') > Expr.cacheLength) {
                    delete cache[keys.shift()];
                }
                return cache[key + ' '] = value;
            }
            return cache;
        }
        function markFunction(fn) {
            fn[expando] = true;
            return fn;
        }
        function assert(fn) {
            var el = document.createElement('fieldset');
            try {
                return !!fn(el);
            } catch (e) {
                return false;
            } finally {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
                el = null;
            }
        }
        function addHandle(attrs, handler) {
            var arr = attrs.split('|'), i = arr.length;
            while (i--) {
                Expr.attrHandle[arr[i]] = handler;
            }
        }
        function siblingCheck(a, b) {
            var cur = b && a, diff = cur && a.nodeType === 1 && b.nodeType === 1 && a.sourceIndex - b.sourceIndex;
            if (diff) {
                return diff;
            }
            if (cur) {
                while (cur = cur.nextSibling) {
                    if (cur === b) {
                        return -1;
                    }
                }
            }
            return a ? 1 : -1;
        }
        function createInputPseudo(type) {
            return function (elem) {
                var name = elem.nodeName.toLowerCase();
                return name === 'input' && elem.type === type;
            };
        }
        function createButtonPseudo(type) {
            return function (elem) {
                var name = elem.nodeName.toLowerCase();
                return (name === 'input' || name === 'button') && elem.type === type;
            };
        }
        function createDisabledPseudo(disabled) {
            return function (elem) {
                if ('form' in elem) {
                    if (elem.parentNode && elem.disabled === false) {
                        if ('label' in elem) {
                            if ('label' in elem.parentNode) {
                                return elem.parentNode.disabled === disabled;
                            } else {
                                return elem.disabled === disabled;
                            }
                        }
                        return elem.isDisabled === disabled || elem.isDisabled !== !disabled && disabledAncestor(elem) === disabled;
                    }
                    return elem.disabled === disabled;
                } else if ('label' in elem) {
                    return elem.disabled === disabled;
                }
                return false;
            };
        }
        function createPositionalPseudo(fn) {
            return markFunction(function (argument) {
                argument = +argument;
                return markFunction(function (seed, matches) {
                    var j, matchIndexes = fn([], seed.length, argument), i = matchIndexes.length;
                    while (i--) {
                        if (seed[j = matchIndexes[i]]) {
                            seed[j] = !(matches[j] = seed[j]);
                        }
                    }
                });
            });
        }
        function testContext(context) {
            return context && typeof context.getElementsByTagName !== 'undefined' && context;
        }
        support = Sizzle.support = {};
        isXML = Sizzle.isXML = function (elem) {
            var documentElement = elem && (elem.ownerDocument || elem).documentElement;
            return documentElement ? documentElement.nodeName !== 'HTML' : false;
        };
        setDocument = Sizzle.setDocument = function (node) {
            var hasCompare, subWindow, doc = node ? node.ownerDocument || node : preferredDoc;
            if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
                return document;
            }
            document = doc;
            docElem = document.documentElement;
            documentIsHTML = !isXML(document);
            if (preferredDoc !== document && (subWindow = document.defaultView) && subWindow.top !== subWindow) {
                if (subWindow.addEventListener) {
                    subWindow.addEventListener('unload', unloadHandler, false);
                } else if (subWindow.attachEvent) {
                    subWindow.attachEvent('onunload', unloadHandler);
                }
            }
            support.attributes = assert(function (el) {
                el.className = 'i';
                return !el.getAttribute('className');
            });
            support.getElementsByTagName = assert(function (el) {
                el.appendChild(document.createComment(''));
                return !el.getElementsByTagName('*').length;
            });
            support.getElementsByClassName = rnative.test(document.getElementsByClassName);
            support.getById = assert(function (el) {
                docElem.appendChild(el).id = expando;
                return !document.getElementsByName || !document.getElementsByName(expando).length;
            });
            if (support.getById) {
                Expr.filter['ID'] = function (id) {
                    var attrId = id.replace(runescape, funescape);
                    return function (elem) {
                        return elem.getAttribute('id') === attrId;
                    };
                };
                Expr.find['ID'] = function (id, context) {
                    if (typeof context.getElementById !== 'undefined' && documentIsHTML) {
                        var elem = context.getElementById(id);
                        return elem ? [elem] : [];
                    }
                };
            } else {
                Expr.filter['ID'] = function (id) {
                    var attrId = id.replace(runescape, funescape);
                    return function (elem) {
                        var node = typeof elem.getAttributeNode !== 'undefined' && elem.getAttributeNode('id');
                        return node && node.value === attrId;
                    };
                };
                Expr.find['ID'] = function (id, context) {
                    if (typeof context.getElementById !== 'undefined' && documentIsHTML) {
                        var node, i, elems, elem = context.getElementById(id);
                        if (elem) {
                            node = elem.getAttributeNode('id');
                            if (node && node.value === id) {
                                return [elem];
                            }
                            elems = context.getElementsByName(id);
                            i = 0;
                            while (elem = elems[i++]) {
                                node = elem.getAttributeNode('id');
                                if (node && node.value === id) {
                                    return [elem];
                                }
                            }
                        }
                        return [];
                    }
                };
            }
            Expr.find['TAG'] = support.getElementsByTagName ? function (tag, context) {
                if (typeof context.getElementsByTagName !== 'undefined') {
                    return context.getElementsByTagName(tag);
                } else if (support.qsa) {
                    return context.querySelectorAll(tag);
                }
            } : function (tag, context) {
                var elem, tmp = [], i = 0, results = context.getElementsByTagName(tag);
                if (tag === '*') {
                    while (elem = results[i++]) {
                        if (elem.nodeType === 1) {
                            tmp.push(elem);
                        }
                    }
                    return tmp;
                }
                return results;
            };
            Expr.find['CLASS'] = support.getElementsByClassName && function (className, context) {
                if (typeof context.getElementsByClassName !== 'undefined' && documentIsHTML) {
                    return context.getElementsByClassName(className);
                }
            };
            rbuggyMatches = [];
            rbuggyQSA = [];
            if (support.qsa = rnative.test(document.querySelectorAll)) {
                assert(function (el) {
                    docElem.appendChild(el).innerHTML = '<a id=\'' + expando + '\'></a>' + '<select id=\'' + expando + '-\r\\\' msallowcapture=\'\'>' + '<option selected=\'\'></option></select>';
                    if (el.querySelectorAll('[msallowcapture^=\'\']').length) {
                        rbuggyQSA.push('[*^$]=' + whitespace + '*(?:\'\'|"")');
                    }
                    if (!el.querySelectorAll('[selected]').length) {
                        rbuggyQSA.push('\\[' + whitespace + '*(?:value|' + booleans + ')');
                    }
                    if (!el.querySelectorAll('[id~=' + expando + '-]').length) {
                        rbuggyQSA.push('~=');
                    }
                    if (!el.querySelectorAll(':checked').length) {
                        rbuggyQSA.push(':checked');
                    }
                    if (!el.querySelectorAll('a#' + expando + '+*').length) {
                        rbuggyQSA.push('.#.+[+~]');
                    }
                });
                assert(function (el) {
                    el.innerHTML = '<a href=\'\' disabled=\'disabled\'></a>' + '<select disabled=\'disabled\'><option/></select>';
                    var input = document.createElement('input');
                    input.setAttribute('type', 'hidden');
                    el.appendChild(input).setAttribute('name', 'D');
                    if (el.querySelectorAll('[name=d]').length) {
                        rbuggyQSA.push('name' + whitespace + '*[*^$|!~]?=');
                    }
                    if (el.querySelectorAll(':enabled').length !== 2) {
                        rbuggyQSA.push(':enabled', ':disabled');
                    }
                    docElem.appendChild(el).disabled = true;
                    if (el.querySelectorAll(':disabled').length !== 2) {
                        rbuggyQSA.push(':enabled', ':disabled');
                    }
                    el.querySelectorAll('*,:x');
                    rbuggyQSA.push(',.*:');
                });
            }
            if (support.matchesSelector = rnative.test(matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)) {
                assert(function (el) {
                    support.disconnectedMatch = matches.call(el, '*');
                    matches.call(el, '[s!=\'\']:x');
                    rbuggyMatches.push('!=', pseudos);
                });
            }
            rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join('|'));
            rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join('|'));
            hasCompare = rnative.test(docElem.compareDocumentPosition);
            contains = hasCompare || rnative.test(docElem.contains) ? function (a, b) {
                var adown = a.nodeType === 9 ? a.documentElement : a, bup = b && b.parentNode;
                return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
            } : function (a, b) {
                if (b) {
                    while (b = b.parentNode) {
                        if (b === a) {
                            return true;
                        }
                    }
                }
                return false;
            };
            sortOrder = hasCompare ? function (a, b) {
                if (a === b) {
                    hasDuplicate = true;
                    return 0;
                }
                var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
                if (compare) {
                    return compare;
                }
                compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
                if (compare & 1 || !support.sortDetached && b.compareDocumentPosition(a) === compare) {
                    if (a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
                        return -1;
                    }
                    if (b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
                        return 1;
                    }
                    return sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
                }
                return compare & 4 ? -1 : 1;
            } : function (a, b) {
                if (a === b) {
                    hasDuplicate = true;
                    return 0;
                }
                var cur, i = 0, aup = a.parentNode, bup = b.parentNode, ap = [a], bp = [b];
                if (!aup || !bup) {
                    return a === document ? -1 : b === document ? 1 : aup ? -1 : bup ? 1 : sortInput ? indexOf(sortInput, a) - indexOf(sortInput, b) : 0;
                } else if (aup === bup) {
                    return siblingCheck(a, b);
                }
                cur = a;
                while (cur = cur.parentNode) {
                    ap.unshift(cur);
                }
                cur = b;
                while (cur = cur.parentNode) {
                    bp.unshift(cur);
                }
                while (ap[i] === bp[i]) {
                    i++;
                }
                return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
            };
            return document;
        };
        Sizzle.matches = function (expr, elements) {
            return Sizzle(expr, null, null, elements);
        };
        Sizzle.matchesSelector = function (elem, expr) {
            if ((elem.ownerDocument || elem) !== document) {
                setDocument(elem);
            }
            expr = expr.replace(rattributeQuotes, '=\'$1\']');
            if (support.matchesSelector && documentIsHTML && !compilerCache[expr + ' '] && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
                try {
                    var ret = matches.call(elem, expr);
                    if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
                        return ret;
                    }
                } catch (e) {
                }
            }
            return Sizzle(expr, document, null, [elem]).length > 0;
        };
        Sizzle.contains = function (context, elem) {
            if ((context.ownerDocument || context) !== document) {
                setDocument(context);
            }
            return contains(context, elem);
        };
        Sizzle.attr = function (elem, name) {
            if ((elem.ownerDocument || elem) !== document) {
                setDocument(elem);
            }
            var fn = Expr.attrHandle[name.toLowerCase()], val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
            return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        };
        Sizzle.escape = function (sel) {
            return (sel + '').replace(rcssescape, fcssescape);
        };
        Sizzle.error = function (msg) {
            throw new Error('Syntax error, unrecognized expression: ' + msg);
        };
        Sizzle.uniqueSort = function (results) {
            var elem, duplicates = [], j = 0, i = 0;
            hasDuplicate = !support.detectDuplicates;
            sortInput = !support.sortStable && results.slice(0);
            results.sort(sortOrder);
            if (hasDuplicate) {
                while (elem = results[i++]) {
                    if (elem === results[i]) {
                        j = duplicates.push(i);
                    }
                }
                while (j--) {
                    results.splice(duplicates[j], 1);
                }
            }
            sortInput = null;
            return results;
        };
        getText = Sizzle.getText = function (elem) {
            var node, ret = '', i = 0, nodeType = elem.nodeType;
            if (!nodeType) {
                while (node = elem[i++]) {
                    ret += getText(node);
                }
            } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
                if (typeof elem.textContent === 'string') {
                    return elem.textContent;
                } else {
                    for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                        ret += getText(elem);
                    }
                }
            } else if (nodeType === 3 || nodeType === 4) {
                return elem.nodeValue;
            }
            return ret;
        };
        Expr = Sizzle.selectors = {
            cacheLength: 50,
            createPseudo: markFunction,
            match: matchExpr,
            attrHandle: {},
            find: {},
            relative: {
                '>': {
                    dir: 'parentNode',
                    first: true
                },
                ' ': { dir: 'parentNode' },
                '+': {
                    dir: 'previousSibling',
                    first: true
                },
                '~': { dir: 'previousSibling' }
            },
            preFilter: {
                'ATTR': function (match) {
                    match[1] = match[1].replace(runescape, funescape);
                    match[3] = (match[3] || match[4] || match[5] || '').replace(runescape, funescape);
                    if (match[2] === '~=') {
                        match[3] = ' ' + match[3] + ' ';
                    }
                    return match.slice(0, 4);
                },
                'CHILD': function (match) {
                    match[1] = match[1].toLowerCase();
                    if (match[1].slice(0, 3) === 'nth') {
                        if (!match[3]) {
                            Sizzle.error(match[0]);
                        }
                        match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === 'even' || match[3] === 'odd'));
                        match[5] = +(match[7] + match[8] || match[3] === 'odd');
                    } else if (match[3]) {
                        Sizzle.error(match[0]);
                    }
                    return match;
                },
                'PSEUDO': function (match) {
                    var excess, unquoted = !match[6] && match[2];
                    if (matchExpr['CHILD'].test(match[0])) {
                        return null;
                    }
                    if (match[3]) {
                        match[2] = match[4] || match[5] || '';
                    } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(')', unquoted.length - excess) - unquoted.length)) {
                        match[0] = match[0].slice(0, excess);
                        match[2] = unquoted.slice(0, excess);
                    }
                    return match.slice(0, 3);
                }
            },
            filter: {
                'TAG': function (nodeNameSelector) {
                    var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
                    return nodeNameSelector === '*' ? function () {
                        return true;
                    } : function (elem) {
                        return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
                    };
                },
                'CLASS': function (className) {
                    var pattern = classCache[className + ' '];
                    return pattern || (pattern = new RegExp('(^|' + whitespace + ')' + className + '(' + whitespace + '|$)')) && classCache(className, function (elem) {
                        return pattern.test(typeof elem.className === 'string' && elem.className || typeof elem.getAttribute !== 'undefined' && elem.getAttribute('class') || '');
                    });
                },
                'ATTR': function (name, operator, check) {
                    return function (elem) {
                        var result = Sizzle.attr(elem, name);
                        if (result == null) {
                            return operator === '!=';
                        }
                        if (!operator) {
                            return true;
                        }
                        result += '';
                        return operator === '=' ? result === check : operator === '!=' ? result !== check : operator === '^=' ? check && result.indexOf(check) === 0 : operator === '*=' ? check && result.indexOf(check) > -1 : operator === '$=' ? check && result.slice(-check.length) === check : operator === '~=' ? (' ' + result.replace(rwhitespace, ' ') + ' ').indexOf(check) > -1 : operator === '|=' ? result === check || result.slice(0, check.length + 1) === check + '-' : false;
                    };
                },
                'CHILD': function (type, what, argument, first, last) {
                    var simple = type.slice(0, 3) !== 'nth', forward = type.slice(-4) !== 'last', ofType = what === 'of-type';
                    return first === 1 && last === 0 ? function (elem) {
                        return !!elem.parentNode;
                    } : function (elem, context, xml) {
                        var cache, uniqueCache, outerCache, node, nodeIndex, start, dir = simple !== forward ? 'nextSibling' : 'previousSibling', parent = elem.parentNode, name = ofType && elem.nodeName.toLowerCase(), useCache = !xml && !ofType, diff = false;
                        if (parent) {
                            if (simple) {
                                while (dir) {
                                    node = elem;
                                    while (node = node[dir]) {
                                        if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                                            return false;
                                        }
                                    }
                                    start = dir = type === 'only' && !start && 'nextSibling';
                                }
                                return true;
                            }
                            start = [forward ? parent.firstChild : parent.lastChild];
                            if (forward && useCache) {
                                node = parent;
                                outerCache = node[expando] || (node[expando] = {});
                                uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                                cache = uniqueCache[type] || [];
                                nodeIndex = cache[0] === dirruns && cache[1];
                                diff = nodeIndex && cache[2];
                                node = nodeIndex && parent.childNodes[nodeIndex];
                                while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {
                                    if (node.nodeType === 1 && ++diff && node === elem) {
                                        uniqueCache[type] = [
                                            dirruns,
                                            nodeIndex,
                                            diff
                                        ];
                                        break;
                                    }
                                }
                            } else {
                                if (useCache) {
                                    node = elem;
                                    outerCache = node[expando] || (node[expando] = {});
                                    uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                                    cache = uniqueCache[type] || [];
                                    nodeIndex = cache[0] === dirruns && cache[1];
                                    diff = nodeIndex;
                                }
                                if (diff === false) {
                                    while (node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop()) {
                                        if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                                            if (useCache) {
                                                outerCache = node[expando] || (node[expando] = {});
                                                uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                                                uniqueCache[type] = [
                                                    dirruns,
                                                    diff
                                                ];
                                            }
                                            if (node === elem) {
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            diff -= last;
                            return diff === first || diff % first === 0 && diff / first >= 0;
                        }
                    };
                },
                'PSEUDO': function (pseudo, argument) {
                    var args, fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error('unsupported pseudo: ' + pseudo);
                    if (fn[expando]) {
                        return fn(argument);
                    }
                    if (fn.length > 1) {
                        args = [
                            pseudo,
                            pseudo,
                            '',
                            argument
                        ];
                        return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function (seed, matches) {
                            var idx, matched = fn(seed, argument), i = matched.length;
                            while (i--) {
                                idx = indexOf(seed, matched[i]);
                                seed[idx] = !(matches[idx] = matched[i]);
                            }
                        }) : function (elem) {
                            return fn(elem, 0, args);
                        };
                    }
                    return fn;
                }
            },
            pseudos: {
                'not': markFunction(function (selector) {
                    var input = [], results = [], matcher = compile(selector.replace(rtrim, '$1'));
                    return matcher[expando] ? markFunction(function (seed, matches, context, xml) {
                        var elem, unmatched = matcher(seed, null, xml, []), i = seed.length;
                        while (i--) {
                            if (elem = unmatched[i]) {
                                seed[i] = !(matches[i] = elem);
                            }
                        }
                    }) : function (elem, context, xml) {
                        input[0] = elem;
                        matcher(input, null, xml, results);
                        input[0] = null;
                        return !results.pop();
                    };
                }),
                'has': markFunction(function (selector) {
                    return function (elem) {
                        return Sizzle(selector, elem).length > 0;
                    };
                }),
                'contains': markFunction(function (text) {
                    text = text.replace(runescape, funescape);
                    return function (elem) {
                        return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
                    };
                }),
                'lang': markFunction(function (lang) {
                    if (!ridentifier.test(lang || '')) {
                        Sizzle.error('unsupported lang: ' + lang);
                    }
                    lang = lang.replace(runescape, funescape).toLowerCase();
                    return function (elem) {
                        var elemLang;
                        do {
                            if (elemLang = documentIsHTML ? elem.lang : elem.getAttribute('xml:lang') || elem.getAttribute('lang')) {
                                elemLang = elemLang.toLowerCase();
                                return elemLang === lang || elemLang.indexOf(lang + '-') === 0;
                            }
                        } while ((elem = elem.parentNode) && elem.nodeType === 1);
                        return false;
                    };
                }),
                'target': function (elem) {
                    var hash = window.location && window.location.hash;
                    return hash && hash.slice(1) === elem.id;
                },
                'root': function (elem) {
                    return elem === docElem;
                },
                'focus': function (elem) {
                    return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
                },
                'enabled': createDisabledPseudo(false),
                'disabled': createDisabledPseudo(true),
                'checked': function (elem) {
                    var nodeName = elem.nodeName.toLowerCase();
                    return nodeName === 'input' && !!elem.checked || nodeName === 'option' && !!elem.selected;
                },
                'selected': function (elem) {
                    if (elem.parentNode) {
                        elem.parentNode.selectedIndex;
                    }
                    return elem.selected === true;
                },
                'empty': function (elem) {
                    for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
                        if (elem.nodeType < 6) {
                            return false;
                        }
                    }
                    return true;
                },
                'parent': function (elem) {
                    return !Expr.pseudos['empty'](elem);
                },
                'header': function (elem) {
                    return rheader.test(elem.nodeName);
                },
                'input': function (elem) {
                    return rinputs.test(elem.nodeName);
                },
                'button': function (elem) {
                    var name = elem.nodeName.toLowerCase();
                    return name === 'input' && elem.type === 'button' || name === 'button';
                },
                'text': function (elem) {
                    var attr;
                    return elem.nodeName.toLowerCase() === 'input' && elem.type === 'text' && ((attr = elem.getAttribute('type')) == null || attr.toLowerCase() === 'text');
                },
                'first': createPositionalPseudo(function () {
                    return [0];
                }),
                'last': createPositionalPseudo(function (matchIndexes, length) {
                    return [length - 1];
                }),
                'eq': createPositionalPseudo(function (matchIndexes, length, argument) {
                    return [argument < 0 ? argument + length : argument];
                }),
                'even': createPositionalPseudo(function (matchIndexes, length) {
                    var i = 0;
                    for (; i < length; i += 2) {
                        matchIndexes.push(i);
                    }
                    return matchIndexes;
                }),
                'odd': createPositionalPseudo(function (matchIndexes, length) {
                    var i = 1;
                    for (; i < length; i += 2) {
                        matchIndexes.push(i);
                    }
                    return matchIndexes;
                }),
                'lt': createPositionalPseudo(function (matchIndexes, length, argument) {
                    var i = argument < 0 ? argument + length : argument;
                    for (; --i >= 0;) {
                        matchIndexes.push(i);
                    }
                    return matchIndexes;
                }),
                'gt': createPositionalPseudo(function (matchIndexes, length, argument) {
                    var i = argument < 0 ? argument + length : argument;
                    for (; ++i < length;) {
                        matchIndexes.push(i);
                    }
                    return matchIndexes;
                })
            }
        };
        Expr.pseudos['nth'] = Expr.pseudos['eq'];
        for (i in {
                radio: true,
                checkbox: true,
                file: true,
                password: true,
                image: true
            }) {
            Expr.pseudos[i] = createInputPseudo(i);
        }
        for (i in {
                submit: true,
                reset: true
            }) {
            Expr.pseudos[i] = createButtonPseudo(i);
        }
        function setFilters() {
        }
        setFilters.prototype = Expr.filters = Expr.pseudos;
        Expr.setFilters = new setFilters();
        tokenize = Sizzle.tokenize = function (selector, parseOnly) {
            var matched, match, tokens, type, soFar, groups, preFilters, cached = tokenCache[selector + ' '];
            if (cached) {
                return parseOnly ? 0 : cached.slice(0);
            }
            soFar = selector;
            groups = [];
            preFilters = Expr.preFilter;
            while (soFar) {
                if (!matched || (match = rcomma.exec(soFar))) {
                    if (match) {
                        soFar = soFar.slice(match[0].length) || soFar;
                    }
                    groups.push(tokens = []);
                }
                matched = false;
                if (match = rcombinators.exec(soFar)) {
                    matched = match.shift();
                    tokens.push({
                        value: matched,
                        type: match[0].replace(rtrim, ' ')
                    });
                    soFar = soFar.slice(matched.length);
                }
                for (type in Expr.filter) {
                    if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
                        matched = match.shift();
                        tokens.push({
                            value: matched,
                            type: type,
                            matches: match
                        });
                        soFar = soFar.slice(matched.length);
                    }
                }
                if (!matched) {
                    break;
                }
            }
            return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
        };
        function toSelector(tokens) {
            var i = 0, len = tokens.length, selector = '';
            for (; i < len; i++) {
                selector += tokens[i].value;
            }
            return selector;
        }
        function addCombinator(matcher, combinator, base) {
            var dir = combinator.dir, skip = combinator.next, key = skip || dir, checkNonElements = base && key === 'parentNode', doneName = done++;
            return combinator.first ? function (elem, context, xml) {
                while (elem = elem[dir]) {
                    if (elem.nodeType === 1 || checkNonElements) {
                        return matcher(elem, context, xml);
                    }
                }
                return false;
            } : function (elem, context, xml) {
                var oldCache, uniqueCache, outerCache, newCache = [
                        dirruns,
                        doneName
                    ];
                if (xml) {
                    while (elem = elem[dir]) {
                        if (elem.nodeType === 1 || checkNonElements) {
                            if (matcher(elem, context, xml)) {
                                return true;
                            }
                        }
                    }
                } else {
                    while (elem = elem[dir]) {
                        if (elem.nodeType === 1 || checkNonElements) {
                            outerCache = elem[expando] || (elem[expando] = {});
                            uniqueCache = outerCache[elem.uniqueID] || (outerCache[elem.uniqueID] = {});
                            if (skip && skip === elem.nodeName.toLowerCase()) {
                                elem = elem[dir] || elem;
                            } else if ((oldCache = uniqueCache[key]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                                return newCache[2] = oldCache[2];
                            } else {
                                uniqueCache[key] = newCache;
                                if (newCache[2] = matcher(elem, context, xml)) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                return false;
            };
        }
        function elementMatcher(matchers) {
            return matchers.length > 1 ? function (elem, context, xml) {
                var i = matchers.length;
                while (i--) {
                    if (!matchers[i](elem, context, xml)) {
                        return false;
                    }
                }
                return true;
            } : matchers[0];
        }
        function multipleContexts(selector, contexts, results) {
            var i = 0, len = contexts.length;
            for (; i < len; i++) {
                Sizzle(selector, contexts[i], results);
            }
            return results;
        }
        function condense(unmatched, map, filter, context, xml) {
            var elem, newUnmatched = [], i = 0, len = unmatched.length, mapped = map != null;
            for (; i < len; i++) {
                if (elem = unmatched[i]) {
                    if (!filter || filter(elem, context, xml)) {
                        newUnmatched.push(elem);
                        if (mapped) {
                            map.push(i);
                        }
                    }
                }
            }
            return newUnmatched;
        }
        function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
            if (postFilter && !postFilter[expando]) {
                postFilter = setMatcher(postFilter);
            }
            if (postFinder && !postFinder[expando]) {
                postFinder = setMatcher(postFinder, postSelector);
            }
            return markFunction(function (seed, results, context, xml) {
                var temp, i, elem, preMap = [], postMap = [], preexisting = results.length, elems = seed || multipleContexts(selector || '*', context.nodeType ? [context] : context, []), matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems, matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
                if (matcher) {
                    matcher(matcherIn, matcherOut, context, xml);
                }
                if (postFilter) {
                    temp = condense(matcherOut, postMap);
                    postFilter(temp, [], context, xml);
                    i = temp.length;
                    while (i--) {
                        if (elem = temp[i]) {
                            matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
                        }
                    }
                }
                if (seed) {
                    if (postFinder || preFilter) {
                        if (postFinder) {
                            temp = [];
                            i = matcherOut.length;
                            while (i--) {
                                if (elem = matcherOut[i]) {
                                    temp.push(matcherIn[i] = elem);
                                }
                            }
                            postFinder(null, matcherOut = [], temp, xml);
                        }
                        i = matcherOut.length;
                        while (i--) {
                            if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                                seed[temp] = !(results[temp] = elem);
                            }
                        }
                    }
                } else {
                    matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
                    if (postFinder) {
                        postFinder(null, results, matcherOut, xml);
                    } else {
                        push.apply(results, matcherOut);
                    }
                }
            });
        }
        function matcherFromTokens(tokens) {
            var checkContext, matcher, j, len = tokens.length, leadingRelative = Expr.relative[tokens[0].type], implicitRelative = leadingRelative || Expr.relative[' '], i = leadingRelative ? 1 : 0, matchContext = addCombinator(function (elem) {
                    return elem === checkContext;
                }, implicitRelative, true), matchAnyContext = addCombinator(function (elem) {
                    return indexOf(checkContext, elem) > -1;
                }, implicitRelative, true), matchers = [function (elem, context, xml) {
                        var ret = !leadingRelative && (xml || context !== outermostContext) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
                        checkContext = null;
                        return ret;
                    }];
            for (; i < len; i++) {
                if (matcher = Expr.relative[tokens[i].type]) {
                    matchers = [addCombinator(elementMatcher(matchers), matcher)];
                } else {
                    matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
                    if (matcher[expando]) {
                        j = ++i;
                        for (; j < len; j++) {
                            if (Expr.relative[tokens[j].type]) {
                                break;
                            }
                        }
                        return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({ value: tokens[i - 2].type === ' ' ? '*' : '' })).replace(rtrim, '$1'), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens(tokens = tokens.slice(j)), j < len && toSelector(tokens));
                    }
                    matchers.push(matcher);
                }
            }
            return elementMatcher(matchers);
        }
        function matcherFromGroupMatchers(elementMatchers, setMatchers) {
            var bySet = setMatchers.length > 0, byElement = elementMatchers.length > 0, superMatcher = function (seed, context, xml, results, outermost) {
                    var elem, j, matcher, matchedCount = 0, i = '0', unmatched = seed && [], setMatched = [], contextBackup = outermostContext, elems = seed || byElement && Expr.find['TAG']('*', outermost), dirrunsUnique = dirruns += contextBackup == null ? 1 : Math.random() || 0.1, len = elems.length;
                    if (outermost) {
                        outermostContext = context === document || context || outermost;
                    }
                    for (; i !== len && (elem = elems[i]) != null; i++) {
                        if (byElement && elem) {
                            j = 0;
                            if (!context && elem.ownerDocument !== document) {
                                setDocument(elem);
                                xml = !documentIsHTML;
                            }
                            while (matcher = elementMatchers[j++]) {
                                if (matcher(elem, context || document, xml)) {
                                    results.push(elem);
                                    break;
                                }
                            }
                            if (outermost) {
                                dirruns = dirrunsUnique;
                            }
                        }
                        if (bySet) {
                            if (elem = !matcher && elem) {
                                matchedCount--;
                            }
                            if (seed) {
                                unmatched.push(elem);
                            }
                        }
                    }
                    matchedCount += i;
                    if (bySet && i !== matchedCount) {
                        j = 0;
                        while (matcher = setMatchers[j++]) {
                            matcher(unmatched, setMatched, context, xml);
                        }
                        if (seed) {
                            if (matchedCount > 0) {
                                while (i--) {
                                    if (!(unmatched[i] || setMatched[i])) {
                                        setMatched[i] = pop.call(results);
                                    }
                                }
                            }
                            setMatched = condense(setMatched);
                        }
                        push.apply(results, setMatched);
                        if (outermost && !seed && setMatched.length > 0 && matchedCount + setMatchers.length > 1) {
                            Sizzle.uniqueSort(results);
                        }
                    }
                    if (outermost) {
                        dirruns = dirrunsUnique;
                        outermostContext = contextBackup;
                    }
                    return unmatched;
                };
            return bySet ? markFunction(superMatcher) : superMatcher;
        }
        compile = Sizzle.compile = function (selector, match) {
            var i, setMatchers = [], elementMatchers = [], cached = compilerCache[selector + ' '];
            if (!cached) {
                if (!match) {
                    match = tokenize(selector);
                }
                i = match.length;
                while (i--) {
                    cached = matcherFromTokens(match[i]);
                    if (cached[expando]) {
                        setMatchers.push(cached);
                    } else {
                        elementMatchers.push(cached);
                    }
                }
                cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
                cached.selector = selector;
            }
            return cached;
        };
        select = Sizzle.select = function (selector, context, results, seed) {
            var i, tokens, token, type, find, compiled = typeof selector === 'function' && selector, match = !seed && tokenize(selector = compiled.selector || selector);
            results = results || [];
            if (match.length === 1) {
                tokens = match[0] = match[0].slice(0);
                if (tokens.length > 2 && (token = tokens[0]).type === 'ID' && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
                    context = (Expr.find['ID'](token.matches[0].replace(runescape, funescape), context) || [])[0];
                    if (!context) {
                        return results;
                    } else if (compiled) {
                        context = context.parentNode;
                    }
                    selector = selector.slice(tokens.shift().value.length);
                }
                i = matchExpr['needsContext'].test(selector) ? 0 : tokens.length;
                while (i--) {
                    token = tokens[i];
                    if (Expr.relative[type = token.type]) {
                        break;
                    }
                    if (find = Expr.find[type]) {
                        if (seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context)) {
                            tokens.splice(i, 1);
                            selector = seed.length && toSelector(tokens);
                            if (!selector) {
                                push.apply(results, seed);
                                return results;
                            }
                            break;
                        }
                    }
                }
            }
            (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, !context || rsibling.test(selector) && testContext(context.parentNode) || context);
            return results;
        };
        support.sortStable = expando.split('').sort(sortOrder).join('') === expando;
        support.detectDuplicates = !!hasDuplicate;
        setDocument();
        support.sortDetached = assert(function (el) {
            return el.compareDocumentPosition(document.createElement('fieldset')) & 1;
        });
        if (!assert(function (el) {
                el.innerHTML = '<a href=\'#\'></a>';
                return el.firstChild.getAttribute('href') === '#';
            })) {
            addHandle('type|href|height|width', function (elem, name, isXML) {
                if (!isXML) {
                    return elem.getAttribute(name, name.toLowerCase() === 'type' ? 1 : 2);
                }
            });
        }
        if (!support.attributes || !assert(function (el) {
                el.innerHTML = '<input/>';
                el.firstChild.setAttribute('value', '');
                return el.firstChild.getAttribute('value') === '';
            })) {
            addHandle('value', function (elem, name, isXML) {
                if (!isXML && elem.nodeName.toLowerCase() === 'input') {
                    return elem.defaultValue;
                }
            });
        }
        if (!assert(function (el) {
                return el.getAttribute('disabled') == null;
            })) {
            addHandle(booleans, function (elem, name, isXML) {
                var val;
                if (!isXML) {
                    return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
                }
            });
        }
        return Sizzle;
    }(window);
    jQuery.find = Sizzle;
    jQuery.expr = Sizzle.selectors;
    jQuery.expr[':'] = jQuery.expr.pseudos;
    jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
    jQuery.text = Sizzle.getText;
    jQuery.isXMLDoc = Sizzle.isXML;
    jQuery.contains = Sizzle.contains;
    jQuery.escapeSelector = Sizzle.escape;
    var dir = function (elem, dir, until) {
        var matched = [], truncate = until !== undefined;
        while ((elem = elem[dir]) && elem.nodeType !== 9) {
            if (elem.nodeType === 1) {
                if (truncate && jQuery(elem).is(until)) {
                    break;
                }
                matched.push(elem);
            }
        }
        return matched;
    };
    var siblings = function (n, elem) {
        var matched = [];
        for (; n; n = n.nextSibling) {
            if (n.nodeType === 1 && n !== elem) {
                matched.push(n);
            }
        }
        return matched;
    };
    var rneedsContext = jQuery.expr.match.needsContext;
    function nodeName(elem, name) {
        return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
    }
    ;
    var rsingleTag = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;
    function winnow(elements, qualifier, not) {
        if (isFunction(qualifier)) {
            return jQuery.grep(elements, function (elem, i) {
                return !!qualifier.call(elem, i, elem) !== not;
            });
        }
        if (qualifier.nodeType) {
            return jQuery.grep(elements, function (elem) {
                return elem === qualifier !== not;
            });
        }
        if (typeof qualifier !== 'string') {
            return jQuery.grep(elements, function (elem) {
                return indexOf.call(qualifier, elem) > -1 !== not;
            });
        }
        return jQuery.filter(qualifier, elements, not);
    }
    jQuery.filter = function (expr, elems, not) {
        var elem = elems[0];
        if (not) {
            expr = ':not(' + expr + ')';
        }
        if (elems.length === 1 && elem.nodeType === 1) {
            return jQuery.find.matchesSelector(elem, expr) ? [elem] : [];
        }
        return jQuery.find.matches(expr, jQuery.grep(elems, function (elem) {
            return elem.nodeType === 1;
        }));
    };
    jQuery.fn.extend({
        find: function (selector) {
            var i, ret, len = this.length, self = this;
            if (typeof selector !== 'string') {
                return this.pushStack(jQuery(selector).filter(function () {
                    for (i = 0; i < len; i++) {
                        if (jQuery.contains(self[i], this)) {
                            return true;
                        }
                    }
                }));
            }
            ret = this.pushStack([]);
            for (i = 0; i < len; i++) {
                jQuery.find(selector, self[i], ret);
            }
            return len > 1 ? jQuery.uniqueSort(ret) : ret;
        },
        filter: function (selector) {
            return this.pushStack(winnow(this, selector || [], false));
        },
        not: function (selector) {
            return this.pushStack(winnow(this, selector || [], true));
        },
        is: function (selector) {
            return !!winnow(this, typeof selector === 'string' && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
        }
    });
    var rootjQuery, rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/, init = jQuery.fn.init = function (selector, context, root) {
            var match, elem;
            if (!selector) {
                return this;
            }
            root = root || rootjQuery;
            if (typeof selector === 'string') {
                if (selector[0] === '<' && selector[selector.length - 1] === '>' && selector.length >= 3) {
                    match = [
                        null,
                        selector,
                        null
                    ];
                } else {
                    match = rquickExpr.exec(selector);
                }
                if (match && (match[1] || !context)) {
                    if (match[1]) {
                        context = context instanceof jQuery ? context[0] : context;
                        jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
                        if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                            for (match in context) {
                                if (isFunction(this[match])) {
                                    this[match](context[match]);
                                } else {
                                    this.attr(match, context[match]);
                                }
                            }
                        }
                        return this;
                    } else {
                        elem = document.getElementById(match[2]);
                        if (elem) {
                            this[0] = elem;
                            this.length = 1;
                        }
                        return this;
                    }
                } else if (!context || context.jquery) {
                    return (context || root).find(selector);
                } else {
                    return this.constructor(context).find(selector);
                }
            } else if (selector.nodeType) {
                this[0] = selector;
                this.length = 1;
                return this;
            } else if (isFunction(selector)) {
                return root.ready !== undefined ? root.ready(selector) : selector(jQuery);
            }
            return jQuery.makeArray(selector, this);
        };
    init.prototype = jQuery.fn;
    rootjQuery = jQuery(document);
    var rparentsprev = /^(?:parents|prev(?:Until|All))/, guaranteedUnique = {
            children: true,
            contents: true,
            next: true,
            prev: true
        };
    jQuery.fn.extend({
        has: function (target) {
            var targets = jQuery(target, this), l = targets.length;
            return this.filter(function () {
                var i = 0;
                for (; i < l; i++) {
                    if (jQuery.contains(this, targets[i])) {
                        return true;
                    }
                }
            });
        },
        closest: function (selectors, context) {
            var cur, i = 0, l = this.length, matched = [], targets = typeof selectors !== 'string' && jQuery(selectors);
            if (!rneedsContext.test(selectors)) {
                for (; i < l; i++) {
                    for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
                        if (cur.nodeType < 11 && (targets ? targets.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
                            matched.push(cur);
                            break;
                        }
                    }
                }
            }
            return this.pushStack(matched.length > 1 ? jQuery.uniqueSort(matched) : matched);
        },
        index: function (elem) {
            if (!elem) {
                return this[0] && this[0].parentNode ? this.first().prevAll().length : -1;
            }
            if (typeof elem === 'string') {
                return indexOf.call(jQuery(elem), this[0]);
            }
            return indexOf.call(this, elem.jquery ? elem[0] : elem);
        },
        add: function (selector, context) {
            return this.pushStack(jQuery.uniqueSort(jQuery.merge(this.get(), jQuery(selector, context))));
        },
        addBack: function (selector) {
            return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
        }
    });
    function sibling(cur, dir) {
        while ((cur = cur[dir]) && cur.nodeType !== 1) {
        }
        return cur;
    }
    jQuery.each({
        parent: function (elem) {
            var parent = elem.parentNode;
            return parent && parent.nodeType !== 11 ? parent : null;
        },
        parents: function (elem) {
            return dir(elem, 'parentNode');
        },
        parentsUntil: function (elem, i, until) {
            return dir(elem, 'parentNode', until);
        },
        next: function (elem) {
            return sibling(elem, 'nextSibling');
        },
        prev: function (elem) {
            return sibling(elem, 'previousSibling');
        },
        nextAll: function (elem) {
            return dir(elem, 'nextSibling');
        },
        prevAll: function (elem) {
            return dir(elem, 'previousSibling');
        },
        nextUntil: function (elem, i, until) {
            return dir(elem, 'nextSibling', until);
        },
        prevUntil: function (elem, i, until) {
            return dir(elem, 'previousSibling', until);
        },
        siblings: function (elem) {
            return siblings((elem.parentNode || {}).firstChild, elem);
        },
        children: function (elem) {
            return siblings(elem.firstChild);
        },
        contents: function (elem) {
            if (nodeName(elem, 'iframe')) {
                return elem.contentDocument;
            }
            if (nodeName(elem, 'template')) {
                elem = elem.content || elem;
            }
            return jQuery.merge([], elem.childNodes);
        }
    }, function (name, fn) {
        jQuery.fn[name] = function (until, selector) {
            var matched = jQuery.map(this, fn, until);
            if (name.slice(-5) !== 'Until') {
                selector = until;
            }
            if (selector && typeof selector === 'string') {
                matched = jQuery.filter(selector, matched);
            }
            if (this.length > 1) {
                if (!guaranteedUnique[name]) {
                    jQuery.uniqueSort(matched);
                }
                if (rparentsprev.test(name)) {
                    matched.reverse();
                }
            }
            return this.pushStack(matched);
        };
    });
    var rnothtmlwhite = /[^\x20\t\r\n\f]+/g;
    function createOptions(options) {
        var object = {};
        jQuery.each(options.match(rnothtmlwhite) || [], function (_, flag) {
            object[flag] = true;
        });
        return object;
    }
    jQuery.Callbacks = function (options) {
        options = typeof options === 'string' ? createOptions(options) : jQuery.extend({}, options);
        var firing, memory, fired, locked, list = [], queue = [], firingIndex = -1, fire = function () {
                locked = locked || options.once;
                fired = firing = true;
                for (; queue.length; firingIndex = -1) {
                    memory = queue.shift();
                    while (++firingIndex < list.length) {
                        if (list[firingIndex].apply(memory[0], memory[1]) === false && options.stopOnFalse) {
                            firingIndex = list.length;
                            memory = false;
                        }
                    }
                }
                if (!options.memory) {
                    memory = false;
                }
                firing = false;
                if (locked) {
                    if (memory) {
                        list = [];
                    } else {
                        list = '';
                    }
                }
            }, self = {
                add: function () {
                    if (list) {
                        if (memory && !firing) {
                            firingIndex = list.length - 1;
                            queue.push(memory);
                        }
                        (function add(args) {
                            jQuery.each(args, function (_, arg) {
                                if (isFunction(arg)) {
                                    if (!options.unique || !self.has(arg)) {
                                        list.push(arg);
                                    }
                                } else if (arg && arg.length && toType(arg) !== 'string') {
                                    add(arg);
                                }
                            });
                        }(arguments));
                        if (memory && !firing) {
                            fire();
                        }
                    }
                    return this;
                },
                remove: function () {
                    jQuery.each(arguments, function (_, arg) {
                        var index;
                        while ((index = jQuery.inArray(arg, list, index)) > -1) {
                            list.splice(index, 1);
                            if (index <= firingIndex) {
                                firingIndex--;
                            }
                        }
                    });
                    return this;
                },
                has: function (fn) {
                    return fn ? jQuery.inArray(fn, list) > -1 : list.length > 0;
                },
                empty: function () {
                    if (list) {
                        list = [];
                    }
                    return this;
                },
                disable: function () {
                    locked = queue = [];
                    list = memory = '';
                    return this;
                },
                disabled: function () {
                    return !list;
                },
                lock: function () {
                    locked = queue = [];
                    if (!memory && !firing) {
                        list = memory = '';
                    }
                    return this;
                },
                locked: function () {
                    return !!locked;
                },
                fireWith: function (context, args) {
                    if (!locked) {
                        args = args || [];
                        args = [
                            context,
                            args.slice ? args.slice() : args
                        ];
                        queue.push(args);
                        if (!firing) {
                            fire();
                        }
                    }
                    return this;
                },
                fire: function () {
                    self.fireWith(this, arguments);
                    return this;
                },
                fired: function () {
                    return !!fired;
                }
            };
        return self;
    };
    function Identity(v) {
        return v;
    }
    function Thrower(ex) {
        throw ex;
    }
    function adoptValue(value, resolve, reject, noValue) {
        var method;
        try {
            if (value && isFunction(method = value.promise)) {
                method.call(value).done(resolve).fail(reject);
            } else if (value && isFunction(method = value.then)) {
                method.call(value, resolve, reject);
            } else {
                resolve.apply(undefined, [value].slice(noValue));
            }
        } catch (value) {
            reject.apply(undefined, [value]);
        }
    }
    jQuery.extend({
        Deferred: function (func) {
            var tuples = [
                    [
                        'notify',
                        'progress',
                        jQuery.Callbacks('memory'),
                        jQuery.Callbacks('memory'),
                        2
                    ],
                    [
                        'resolve',
                        'done',
                        jQuery.Callbacks('once memory'),
                        jQuery.Callbacks('once memory'),
                        0,
                        'resolved'
                    ],
                    [
                        'reject',
                        'fail',
                        jQuery.Callbacks('once memory'),
                        jQuery.Callbacks('once memory'),
                        1,
                        'rejected'
                    ]
                ], state = 'pending', promise = {
                    state: function () {
                        return state;
                    },
                    always: function () {
                        deferred.done(arguments).fail(arguments);
                        return this;
                    },
                    'catch': function (fn) {
                        return promise.then(null, fn);
                    },
                    pipe: function () {
                        var fns = arguments;
                        return jQuery.Deferred(function (newDefer) {
                            jQuery.each(tuples, function (i, tuple) {
                                var fn = isFunction(fns[tuple[4]]) && fns[tuple[4]];
                                deferred[tuple[1]](function () {
                                    var returned = fn && fn.apply(this, arguments);
                                    if (returned && isFunction(returned.promise)) {
                                        returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer.reject);
                                    } else {
                                        newDefer[tuple[0] + 'With'](this, fn ? [returned] : arguments);
                                    }
                                });
                            });
                            fns = null;
                        }).promise();
                    },
                    then: function (onFulfilled, onRejected, onProgress) {
                        var maxDepth = 0;
                        function resolve(depth, deferred, handler, special) {
                            return function () {
                                var that = this, args = arguments, mightThrow = function () {
                                        var returned, then;
                                        if (depth < maxDepth) {
                                            return;
                                        }
                                        returned = handler.apply(that, args);
                                        if (returned === deferred.promise()) {
                                            throw new TypeError('Thenable self-resolution');
                                        }
                                        then = returned && (typeof returned === 'object' || typeof returned === 'function') && returned.then;
                                        if (isFunction(then)) {
                                            if (special) {
                                                then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special));
                                            } else {
                                                maxDepth++;
                                                then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
                                            }
                                        } else {
                                            if (handler !== Identity) {
                                                that = undefined;
                                                args = [returned];
                                            }
                                            (special || deferred.resolveWith)(that, args);
                                        }
                                    }, process = special ? mightThrow : function () {
                                        try {
                                            mightThrow();
                                        } catch (e) {
                                            if (jQuery.Deferred.exceptionHook) {
                                                jQuery.Deferred.exceptionHook(e, process.stackTrace);
                                            }
                                            if (depth + 1 >= maxDepth) {
                                                if (handler !== Thrower) {
                                                    that = undefined;
                                                    args = [e];
                                                }
                                                deferred.rejectWith(that, args);
                                            }
                                        }
                                    };
                                if (depth) {
                                    process();
                                } else {
                                    if (jQuery.Deferred.getStackHook) {
                                        process.stackTrace = jQuery.Deferred.getStackHook();
                                    }
                                    window.setTimeout(process);
                                }
                            };
                        }
                        return jQuery.Deferred(function (newDefer) {
                            tuples[0][3].add(resolve(0, newDefer, isFunction(onProgress) ? onProgress : Identity, newDefer.notifyWith));
                            tuples[1][3].add(resolve(0, newDefer, isFunction(onFulfilled) ? onFulfilled : Identity));
                            tuples[2][3].add(resolve(0, newDefer, isFunction(onRejected) ? onRejected : Thrower));
                        }).promise();
                    },
                    promise: function (obj) {
                        return obj != null ? jQuery.extend(obj, promise) : promise;
                    }
                }, deferred = {};
            jQuery.each(tuples, function (i, tuple) {
                var list = tuple[2], stateString = tuple[5];
                promise[tuple[1]] = list.add;
                if (stateString) {
                    list.add(function () {
                        state = stateString;
                    }, tuples[3 - i][2].disable, tuples[3 - i][3].disable, tuples[0][2].lock, tuples[0][3].lock);
                }
                list.add(tuple[3].fire);
                deferred[tuple[0]] = function () {
                    deferred[tuple[0] + 'With'](this === deferred ? undefined : this, arguments);
                    return this;
                };
                deferred[tuple[0] + 'With'] = list.fireWith;
            });
            promise.promise(deferred);
            if (func) {
                func.call(deferred, deferred);
            }
            return deferred;
        },
        when: function (singleValue) {
            var remaining = arguments.length, i = remaining, resolveContexts = Array(i), resolveValues = slice.call(arguments), master = jQuery.Deferred(), updateFunc = function (i) {
                    return function (value) {
                        resolveContexts[i] = this;
                        resolveValues[i] = arguments.length > 1 ? slice.call(arguments) : value;
                        if (!--remaining) {
                            master.resolveWith(resolveContexts, resolveValues);
                        }
                    };
                };
            if (remaining <= 1) {
                adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject, !remaining);
                if (master.state() === 'pending' || isFunction(resolveValues[i] && resolveValues[i].then)) {
                    return master.then();
                }
            }
            while (i--) {
                adoptValue(resolveValues[i], updateFunc(i), master.reject);
            }
            return master.promise();
        }
    });
    var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;
    jQuery.Deferred.exceptionHook = function (error, stack) {
        if (window.console && window.console.warn && error && rerrorNames.test(error.name)) {
            window.console.warn('jQuery.Deferred exception: ' + error.message, error.stack, stack);
        }
    };
    jQuery.readyException = function (error) {
        window.setTimeout(function () {
            throw error;
        });
    };
    var readyList = jQuery.Deferred();
    jQuery.fn.ready = function (fn) {
        readyList.then(fn).catch(function (error) {
            jQuery.readyException(error);
        });
        return this;
    };
    jQuery.extend({
        isReady: false,
        readyWait: 1,
        ready: function (wait) {
            if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
                return;
            }
            jQuery.isReady = true;
            if (wait !== true && --jQuery.readyWait > 0) {
                return;
            }
            readyList.resolveWith(document, [jQuery]);
        }
    });
    jQuery.ready.then = readyList.then;
    function completed() {
        document.removeEventListener('DOMContentLoaded', completed);
        window.removeEventListener('load', completed);
        jQuery.ready();
    }
    if (document.readyState === 'complete' || document.readyState !== 'loading' && !document.documentElement.doScroll) {
        window.setTimeout(jQuery.ready);
    } else {
        document.addEventListener('DOMContentLoaded', completed);
        window.addEventListener('load', completed);
    }
    var access = function (elems, fn, key, value, chainable, emptyGet, raw) {
        var i = 0, len = elems.length, bulk = key == null;
        if (toType(key) === 'object') {
            chainable = true;
            for (i in key) {
                access(elems, fn, i, key[i], true, emptyGet, raw);
            }
        } else if (value !== undefined) {
            chainable = true;
            if (!isFunction(value)) {
                raw = true;
            }
            if (bulk) {
                if (raw) {
                    fn.call(elems, value);
                    fn = null;
                } else {
                    bulk = fn;
                    fn = function (elem, key, value) {
                        return bulk.call(jQuery(elem), value);
                    };
                }
            }
            if (fn) {
                for (; i < len; i++) {
                    fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
                }
            }
        }
        if (chainable) {
            return elems;
        }
        if (bulk) {
            return fn.call(elems);
        }
        return len ? fn(elems[0], key) : emptyGet;
    };
    var rmsPrefix = /^-ms-/, rdashAlpha = /-([a-z])/g;
    function fcamelCase(all, letter) {
        return letter.toUpperCase();
    }
    function camelCase(string) {
        return string.replace(rmsPrefix, 'ms-').replace(rdashAlpha, fcamelCase);
    }
    var acceptData = function (owner) {
        return owner.nodeType === 1 || owner.nodeType === 9 || !+owner.nodeType;
    };
    function Data() {
        this.expando = jQuery.expando + Data.uid++;
    }
    Data.uid = 1;
    Data.prototype = {
        cache: function (owner) {
            var value = owner[this.expando];
            if (!value) {
                value = {};
                if (acceptData(owner)) {
                    if (owner.nodeType) {
                        owner[this.expando] = value;
                    } else {
                        Object.defineProperty(owner, this.expando, {
                            value: value,
                            configurable: true
                        });
                    }
                }
            }
            return value;
        },
        set: function (owner, data, value) {
            var prop, cache = this.cache(owner);
            if (typeof data === 'string') {
                cache[camelCase(data)] = value;
            } else {
                for (prop in data) {
                    cache[camelCase(prop)] = data[prop];
                }
            }
            return cache;
        },
        get: function (owner, key) {
            return key === undefined ? this.cache(owner) : owner[this.expando] && owner[this.expando][camelCase(key)];
        },
        access: function (owner, key, value) {
            if (key === undefined || key && typeof key === 'string' && value === undefined) {
                return this.get(owner, key);
            }
            this.set(owner, key, value);
            return value !== undefined ? value : key;
        },
        remove: function (owner, key) {
            var i, cache = owner[this.expando];
            if (cache === undefined) {
                return;
            }
            if (key !== undefined) {
                if (Array.isArray(key)) {
                    key = key.map(camelCase);
                } else {
                    key = camelCase(key);
                    key = key in cache ? [key] : key.match(rnothtmlwhite) || [];
                }
                i = key.length;
                while (i--) {
                    delete cache[key[i]];
                }
            }
            if (key === undefined || jQuery.isEmptyObject(cache)) {
                if (owner.nodeType) {
                    owner[this.expando] = undefined;
                } else {
                    delete owner[this.expando];
                }
            }
        },
        hasData: function (owner) {
            var cache = owner[this.expando];
            return cache !== undefined && !jQuery.isEmptyObject(cache);
        }
    };
    var dataPriv = new Data();
    var dataUser = new Data();
    var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/, rmultiDash = /[A-Z]/g;
    function getData(data) {
        if (data === 'true') {
            return true;
        }
        if (data === 'false') {
            return false;
        }
        if (data === 'null') {
            return null;
        }
        if (data === +data + '') {
            return +data;
        }
        if (rbrace.test(data)) {
            return JSON.parse(data);
        }
        return data;
    }
    function dataAttr(elem, key, data) {
        var name;
        if (data === undefined && elem.nodeType === 1) {
            name = 'data-' + key.replace(rmultiDash, '-$&').toLowerCase();
            data = elem.getAttribute(name);
            if (typeof data === 'string') {
                try {
                    data = getData(data);
                } catch (e) {
                }
                dataUser.set(elem, key, data);
            } else {
                data = undefined;
            }
        }
        return data;
    }
    jQuery.extend({
        hasData: function (elem) {
            return dataUser.hasData(elem) || dataPriv.hasData(elem);
        },
        data: function (elem, name, data) {
            return dataUser.access(elem, name, data);
        },
        removeData: function (elem, name) {
            dataUser.remove(elem, name);
        },
        _data: function (elem, name, data) {
            return dataPriv.access(elem, name, data);
        },
        _removeData: function (elem, name) {
            dataPriv.remove(elem, name);
        }
    });
    jQuery.fn.extend({
        data: function (key, value) {
            var i, name, data, elem = this[0], attrs = elem && elem.attributes;
            if (key === undefined) {
                if (this.length) {
                    data = dataUser.get(elem);
                    if (elem.nodeType === 1 && !dataPriv.get(elem, 'hasDataAttrs')) {
                        i = attrs.length;
                        while (i--) {
                            if (attrs[i]) {
                                name = attrs[i].name;
                                if (name.indexOf('data-') === 0) {
                                    name = camelCase(name.slice(5));
                                    dataAttr(elem, name, data[name]);
                                }
                            }
                        }
                        dataPriv.set(elem, 'hasDataAttrs', true);
                    }
                }
                return data;
            }
            if (typeof key === 'object') {
                return this.each(function () {
                    dataUser.set(this, key);
                });
            }
            return access(this, function (value) {
                var data;
                if (elem && value === undefined) {
                    data = dataUser.get(elem, key);
                    if (data !== undefined) {
                        return data;
                    }
                    data = dataAttr(elem, key);
                    if (data !== undefined) {
                        return data;
                    }
                    return;
                }
                this.each(function () {
                    dataUser.set(this, key, value);
                });
            }, null, value, arguments.length > 1, null, true);
        },
        removeData: function (key) {
            return this.each(function () {
                dataUser.remove(this, key);
            });
        }
    });
    jQuery.extend({
        queue: function (elem, type, data) {
            var queue;
            if (elem) {
                type = (type || 'fx') + 'queue';
                queue = dataPriv.get(elem, type);
                if (data) {
                    if (!queue || Array.isArray(data)) {
                        queue = dataPriv.access(elem, type, jQuery.makeArray(data));
                    } else {
                        queue.push(data);
                    }
                }
                return queue || [];
            }
        },
        dequeue: function (elem, type) {
            type = type || 'fx';
            var queue = jQuery.queue(elem, type), startLength = queue.length, fn = queue.shift(), hooks = jQuery._queueHooks(elem, type), next = function () {
                    jQuery.dequeue(elem, type);
                };
            if (fn === 'inprogress') {
                fn = queue.shift();
                startLength--;
            }
            if (fn) {
                if (type === 'fx') {
                    queue.unshift('inprogress');
                }
                delete hooks.stop;
                fn.call(elem, next, hooks);
            }
            if (!startLength && hooks) {
                hooks.empty.fire();
            }
        },
        _queueHooks: function (elem, type) {
            var key = type + 'queueHooks';
            return dataPriv.get(elem, key) || dataPriv.access(elem, key, {
                empty: jQuery.Callbacks('once memory').add(function () {
                    dataPriv.remove(elem, [
                        type + 'queue',
                        key
                    ]);
                })
            });
        }
    });
    jQuery.fn.extend({
        queue: function (type, data) {
            var setter = 2;
            if (typeof type !== 'string') {
                data = type;
                type = 'fx';
                setter--;
            }
            if (arguments.length < setter) {
                return jQuery.queue(this[0], type);
            }
            return data === undefined ? this : this.each(function () {
                var queue = jQuery.queue(this, type, data);
                jQuery._queueHooks(this, type);
                if (type === 'fx' && queue[0] !== 'inprogress') {
                    jQuery.dequeue(this, type);
                }
            });
        },
        dequeue: function (type) {
            return this.each(function () {
                jQuery.dequeue(this, type);
            });
        },
        clearQueue: function (type) {
            return this.queue(type || 'fx', []);
        },
        promise: function (type, obj) {
            var tmp, count = 1, defer = jQuery.Deferred(), elements = this, i = this.length, resolve = function () {
                    if (!--count) {
                        defer.resolveWith(elements, [elements]);
                    }
                };
            if (typeof type !== 'string') {
                obj = type;
                type = undefined;
            }
            type = type || 'fx';
            while (i--) {
                tmp = dataPriv.get(elements[i], type + 'queueHooks');
                if (tmp && tmp.empty) {
                    count++;
                    tmp.empty.add(resolve);
                }
            }
            resolve();
            return defer.promise(obj);
        }
    });
    var pnum = /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source;
    var rcssNum = new RegExp('^(?:([+-])=|)(' + pnum + ')([a-z%]*)$', 'i');
    var cssExpand = [
        'Top',
        'Right',
        'Bottom',
        'Left'
    ];
    var isHiddenWithinTree = function (elem, el) {
        elem = el || elem;
        return elem.style.display === 'none' || elem.style.display === '' && jQuery.contains(elem.ownerDocument, elem) && jQuery.css(elem, 'display') === 'none';
    };
    var swap = function (elem, options, callback, args) {
        var ret, name, old = {};
        for (name in options) {
            old[name] = elem.style[name];
            elem.style[name] = options[name];
        }
        ret = callback.apply(elem, args || []);
        for (name in options) {
            elem.style[name] = old[name];
        }
        return ret;
    };
    function adjustCSS(elem, prop, valueParts, tween) {
        var adjusted, scale, maxIterations = 20, currentValue = tween ? function () {
                return tween.cur();
            } : function () {
                return jQuery.css(elem, prop, '');
            }, initial = currentValue(), unit = valueParts && valueParts[3] || (jQuery.cssNumber[prop] ? '' : 'px'), initialInUnit = (jQuery.cssNumber[prop] || unit !== 'px' && +initial) && rcssNum.exec(jQuery.css(elem, prop));
        if (initialInUnit && initialInUnit[3] !== unit) {
            initial = initial / 2;
            unit = unit || initialInUnit[3];
            initialInUnit = +initial || 1;
            while (maxIterations--) {
                jQuery.style(elem, prop, initialInUnit + unit);
                if ((1 - scale) * (1 - (scale = currentValue() / initial || 0.5)) <= 0) {
                    maxIterations = 0;
                }
                initialInUnit = initialInUnit / scale;
            }
            initialInUnit = initialInUnit * 2;
            jQuery.style(elem, prop, initialInUnit + unit);
            valueParts = valueParts || [];
        }
        if (valueParts) {
            initialInUnit = +initialInUnit || +initial || 0;
            adjusted = valueParts[1] ? initialInUnit + (valueParts[1] + 1) * valueParts[2] : +valueParts[2];
            if (tween) {
                tween.unit = unit;
                tween.start = initialInUnit;
                tween.end = adjusted;
            }
        }
        return adjusted;
    }
    var defaultDisplayMap = {};
    function getDefaultDisplay(elem) {
        var temp, doc = elem.ownerDocument, nodeName = elem.nodeName, display = defaultDisplayMap[nodeName];
        if (display) {
            return display;
        }
        temp = doc.body.appendChild(doc.createElement(nodeName));
        display = jQuery.css(temp, 'display');
        temp.parentNode.removeChild(temp);
        if (display === 'none') {
            display = 'block';
        }
        defaultDisplayMap[nodeName] = display;
        return display;
    }
    function showHide(elements, show) {
        var display, elem, values = [], index = 0, length = elements.length;
        for (; index < length; index++) {
            elem = elements[index];
            if (!elem.style) {
                continue;
            }
            display = elem.style.display;
            if (show) {
                if (display === 'none') {
                    values[index] = dataPriv.get(elem, 'display') || null;
                    if (!values[index]) {
                        elem.style.display = '';
                    }
                }
                if (elem.style.display === '' && isHiddenWithinTree(elem)) {
                    values[index] = getDefaultDisplay(elem);
                }
            } else {
                if (display !== 'none') {
                    values[index] = 'none';
                    dataPriv.set(elem, 'display', display);
                }
            }
        }
        for (index = 0; index < length; index++) {
            if (values[index] != null) {
                elements[index].style.display = values[index];
            }
        }
        return elements;
    }
    jQuery.fn.extend({
        show: function () {
            return showHide(this, true);
        },
        hide: function () {
            return showHide(this);
        },
        toggle: function (state) {
            if (typeof state === 'boolean') {
                return state ? this.show() : this.hide();
            }
            return this.each(function () {
                if (isHiddenWithinTree(this)) {
                    jQuery(this).show();
                } else {
                    jQuery(this).hide();
                }
            });
        }
    });
    var rcheckableType = /^(?:checkbox|radio)$/i;
    var rtagName = /<([a-z][^\/\0>\x20\t\r\n\f]+)/i;
    var rscriptType = /^$|^module$|\/(?:java|ecma)script/i;
    var wrapMap = {
        option: [
            1,
            '<select multiple=\'multiple\'>',
            '</select>'
        ],
        thead: [
            1,
            '<table>',
            '</table>'
        ],
        col: [
            2,
            '<table><colgroup>',
            '</colgroup></table>'
        ],
        tr: [
            2,
            '<table><tbody>',
            '</tbody></table>'
        ],
        td: [
            3,
            '<table><tbody><tr>',
            '</tr></tbody></table>'
        ],
        _default: [
            0,
            '',
            ''
        ]
    };
    wrapMap.optgroup = wrapMap.option;
    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;
    function getAll(context, tag) {
        var ret;
        if (typeof context.getElementsByTagName !== 'undefined') {
            ret = context.getElementsByTagName(tag || '*');
        } else if (typeof context.querySelectorAll !== 'undefined') {
            ret = context.querySelectorAll(tag || '*');
        } else {
            ret = [];
        }
        if (tag === undefined || tag && nodeName(context, tag)) {
            return jQuery.merge([context], ret);
        }
        return ret;
    }
    function setGlobalEval(elems, refElements) {
        var i = 0, l = elems.length;
        for (; i < l; i++) {
            dataPriv.set(elems[i], 'globalEval', !refElements || dataPriv.get(refElements[i], 'globalEval'));
        }
    }
    var rhtml = /<|&#?\w+;/;
    function buildFragment(elems, context, scripts, selection, ignored) {
        var elem, tmp, tag, wrap, contains, j, fragment = context.createDocumentFragment(), nodes = [], i = 0, l = elems.length;
        for (; i < l; i++) {
            elem = elems[i];
            if (elem || elem === 0) {
                if (toType(elem) === 'object') {
                    jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
                } else if (!rhtml.test(elem)) {
                    nodes.push(context.createTextNode(elem));
                } else {
                    tmp = tmp || fragment.appendChild(context.createElement('div'));
                    tag = (rtagName.exec(elem) || [
                        '',
                        ''
                    ])[1].toLowerCase();
                    wrap = wrapMap[tag] || wrapMap._default;
                    tmp.innerHTML = wrap[1] + jQuery.htmlPrefilter(elem) + wrap[2];
                    j = wrap[0];
                    while (j--) {
                        tmp = tmp.lastChild;
                    }
                    jQuery.merge(nodes, tmp.childNodes);
                    tmp = fragment.firstChild;
                    tmp.textContent = '';
                }
            }
        }
        fragment.textContent = '';
        i = 0;
        while (elem = nodes[i++]) {
            if (selection && jQuery.inArray(elem, selection) > -1) {
                if (ignored) {
                    ignored.push(elem);
                }
                continue;
            }
            contains = jQuery.contains(elem.ownerDocument, elem);
            tmp = getAll(fragment.appendChild(elem), 'script');
            if (contains) {
                setGlobalEval(tmp);
            }
            if (scripts) {
                j = 0;
                while (elem = tmp[j++]) {
                    if (rscriptType.test(elem.type || '')) {
                        scripts.push(elem);
                    }
                }
            }
        }
        return fragment;
    }
    (function () {
        var fragment = document.createDocumentFragment(), div = fragment.appendChild(document.createElement('div')), input = document.createElement('input');
        input.setAttribute('type', 'radio');
        input.setAttribute('checked', 'checked');
        input.setAttribute('name', 't');
        div.appendChild(input);
        support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
        div.innerHTML = '<textarea>x</textarea>';
        support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
    }());
    var documentElement = document.documentElement;
    var rkeyEvent = /^key/, rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/, rtypenamespace = /^([^.]*)(?:\.(.+)|)/;
    function returnTrue() {
        return true;
    }
    function returnFalse() {
        return false;
    }
    function safeActiveElement() {
        try {
            return document.activeElement;
        } catch (err) {
        }
    }
    function on(elem, types, selector, data, fn, one) {
        var origFn, type;
        if (typeof types === 'object') {
            if (typeof selector !== 'string') {
                data = data || selector;
                selector = undefined;
            }
            for (type in types) {
                on(elem, type, selector, data, types[type], one);
            }
            return elem;
        }
        if (data == null && fn == null) {
            fn = selector;
            data = selector = undefined;
        } else if (fn == null) {
            if (typeof selector === 'string') {
                fn = data;
                data = undefined;
            } else {
                fn = data;
                data = selector;
                selector = undefined;
            }
        }
        if (fn === false) {
            fn = returnFalse;
        } else if (!fn) {
            return elem;
        }
        if (one === 1) {
            origFn = fn;
            fn = function (event) {
                jQuery().off(event);
                return origFn.apply(this, arguments);
            };
            fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
        }
        return elem.each(function () {
            jQuery.event.add(this, types, fn, data, selector);
        });
    }
    jQuery.event = {
        global: {},
        add: function (elem, types, handler, data, selector) {
            var handleObjIn, eventHandle, tmp, events, t, handleObj, special, handlers, type, namespaces, origType, elemData = dataPriv.get(elem);
            if (!elemData) {
                return;
            }
            if (handler.handler) {
                handleObjIn = handler;
                handler = handleObjIn.handler;
                selector = handleObjIn.selector;
            }
            if (selector) {
                jQuery.find.matchesSelector(documentElement, selector);
            }
            if (!handler.guid) {
                handler.guid = jQuery.guid++;
            }
            if (!(events = elemData.events)) {
                events = elemData.events = {};
            }
            if (!(eventHandle = elemData.handle)) {
                eventHandle = elemData.handle = function (e) {
                    return typeof jQuery !== 'undefined' && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
                };
            }
            types = (types || '').match(rnothtmlwhite) || [''];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = origType = tmp[1];
                namespaces = (tmp[2] || '').split('.').sort();
                if (!type) {
                    continue;
                }
                special = jQuery.event.special[type] || {};
                type = (selector ? special.delegateType : special.bindType) || type;
                special = jQuery.event.special[type] || {};
                handleObj = jQuery.extend({
                    type: type,
                    origType: origType,
                    data: data,
                    handler: handler,
                    guid: handler.guid,
                    selector: selector,
                    needsContext: selector && jQuery.expr.match.needsContext.test(selector),
                    namespace: namespaces.join('.')
                }, handleObjIn);
                if (!(handlers = events[type])) {
                    handlers = events[type] = [];
                    handlers.delegateCount = 0;
                    if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
                        if (elem.addEventListener) {
                            elem.addEventListener(type, eventHandle);
                        }
                    }
                }
                if (special.add) {
                    special.add.call(elem, handleObj);
                    if (!handleObj.handler.guid) {
                        handleObj.handler.guid = handler.guid;
                    }
                }
                if (selector) {
                    handlers.splice(handlers.delegateCount++, 0, handleObj);
                } else {
                    handlers.push(handleObj);
                }
                jQuery.event.global[type] = true;
            }
        },
        remove: function (elem, types, handler, selector, mappedTypes) {
            var j, origCount, tmp, events, t, handleObj, special, handlers, type, namespaces, origType, elemData = dataPriv.hasData(elem) && dataPriv.get(elem);
            if (!elemData || !(events = elemData.events)) {
                return;
            }
            types = (types || '').match(rnothtmlwhite) || [''];
            t = types.length;
            while (t--) {
                tmp = rtypenamespace.exec(types[t]) || [];
                type = origType = tmp[1];
                namespaces = (tmp[2] || '').split('.').sort();
                if (!type) {
                    for (type in events) {
                        jQuery.event.remove(elem, type + types[t], handler, selector, true);
                    }
                    continue;
                }
                special = jQuery.event.special[type] || {};
                type = (selector ? special.delegateType : special.bindType) || type;
                handlers = events[type] || [];
                tmp = tmp[2] && new RegExp('(^|\\.)' + namespaces.join('\\.(?:.*\\.|)') + '(\\.|$)');
                origCount = j = handlers.length;
                while (j--) {
                    handleObj = handlers[j];
                    if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === '**' && handleObj.selector)) {
                        handlers.splice(j, 1);
                        if (handleObj.selector) {
                            handlers.delegateCount--;
                        }
                        if (special.remove) {
                            special.remove.call(elem, handleObj);
                        }
                    }
                }
                if (origCount && !handlers.length) {
                    if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
                        jQuery.removeEvent(elem, type, elemData.handle);
                    }
                    delete events[type];
                }
            }
            if (jQuery.isEmptyObject(events)) {
                dataPriv.remove(elem, 'handle events');
            }
        },
        dispatch: function (nativeEvent) {
            var event = jQuery.event.fix(nativeEvent);
            var i, j, ret, matched, handleObj, handlerQueue, args = new Array(arguments.length), handlers = (dataPriv.get(this, 'events') || {})[event.type] || [], special = jQuery.event.special[event.type] || {};
            args[0] = event;
            for (i = 1; i < arguments.length; i++) {
                args[i] = arguments[i];
            }
            event.delegateTarget = this;
            if (special.preDispatch && special.preDispatch.call(this, event) === false) {
                return;
            }
            handlerQueue = jQuery.event.handlers.call(this, event, handlers);
            i = 0;
            while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
                event.currentTarget = matched.elem;
                j = 0;
                while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
                    if (!event.rnamespace || event.rnamespace.test(handleObj.namespace)) {
                        event.handleObj = handleObj;
                        event.data = handleObj.data;
                        ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
                        if (ret !== undefined) {
                            if ((event.result = ret) === false) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                    }
                }
            }
            if (special.postDispatch) {
                special.postDispatch.call(this, event);
            }
            return event.result;
        },
        handlers: function (event, handlers) {
            var i, handleObj, sel, matchedHandlers, matchedSelectors, handlerQueue = [], delegateCount = handlers.delegateCount, cur = event.target;
            if (delegateCount && cur.nodeType && !(event.type === 'click' && event.button >= 1)) {
                for (; cur !== this; cur = cur.parentNode || this) {
                    if (cur.nodeType === 1 && !(event.type === 'click' && cur.disabled === true)) {
                        matchedHandlers = [];
                        matchedSelectors = {};
                        for (i = 0; i < delegateCount; i++) {
                            handleObj = handlers[i];
                            sel = handleObj.selector + ' ';
                            if (matchedSelectors[sel] === undefined) {
                                matchedSelectors[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) > -1 : jQuery.find(sel, this, null, [cur]).length;
                            }
                            if (matchedSelectors[sel]) {
                                matchedHandlers.push(handleObj);
                            }
                        }
                        if (matchedHandlers.length) {
                            handlerQueue.push({
                                elem: cur,
                                handlers: matchedHandlers
                            });
                        }
                    }
                }
            }
            cur = this;
            if (delegateCount < handlers.length) {
                handlerQueue.push({
                    elem: cur,
                    handlers: handlers.slice(delegateCount)
                });
            }
            return handlerQueue;
        },
        addProp: function (name, hook) {
            Object.defineProperty(jQuery.Event.prototype, name, {
                enumerable: true,
                configurable: true,
                get: isFunction(hook) ? function () {
                    if (this.originalEvent) {
                        return hook(this.originalEvent);
                    }
                } : function () {
                    if (this.originalEvent) {
                        return this.originalEvent[name];
                    }
                },
                set: function (value) {
                    Object.defineProperty(this, name, {
                        enumerable: true,
                        configurable: true,
                        writable: true,
                        value: value
                    });
                }
            });
        },
        fix: function (originalEvent) {
            return originalEvent[jQuery.expando] ? originalEvent : new jQuery.Event(originalEvent);
        },
        special: {
            load: { noBubble: true },
            focus: {
                trigger: function () {
                    if (this !== safeActiveElement() && this.focus) {
                        this.focus();
                        return false;
                    }
                },
                delegateType: 'focusin'
            },
            blur: {
                trigger: function () {
                    if (this === safeActiveElement() && this.blur) {
                        this.blur();
                        return false;
                    }
                },
                delegateType: 'focusout'
            },
            click: {
                trigger: function () {
                    if (this.type === 'checkbox' && this.click && nodeName(this, 'input')) {
                        this.click();
                        return false;
                    }
                },
                _default: function (event) {
                    return nodeName(event.target, 'a');
                }
            },
            beforeunload: {
                postDispatch: function (event) {
                    if (event.result !== undefined && event.originalEvent) {
                        event.originalEvent.returnValue = event.result;
                    }
                }
            }
        }
    };
    jQuery.removeEvent = function (elem, type, handle) {
        if (elem.removeEventListener) {
            elem.removeEventListener(type, handle);
        }
    };
    jQuery.Event = function (src, props) {
        if (!(this instanceof jQuery.Event)) {
            return new jQuery.Event(src, props);
        }
        if (src && src.type) {
            this.originalEvent = src;
            this.type = src.type;
            this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
            this.target = src.target && src.target.nodeType === 3 ? src.target.parentNode : src.target;
            this.currentTarget = src.currentTarget;
            this.relatedTarget = src.relatedTarget;
        } else {
            this.type = src;
        }
        if (props) {
            jQuery.extend(this, props);
        }
        this.timeStamp = src && src.timeStamp || Date.now();
        this[jQuery.expando] = true;
    };
    jQuery.Event.prototype = {
        constructor: jQuery.Event,
        isDefaultPrevented: returnFalse,
        isPropagationStopped: returnFalse,
        isImmediatePropagationStopped: returnFalse,
        isSimulated: false,
        preventDefault: function () {
            var e = this.originalEvent;
            this.isDefaultPrevented = returnTrue;
            if (e && !this.isSimulated) {
                e.preventDefault();
            }
        },
        stopPropagation: function () {
            var e = this.originalEvent;
            this.isPropagationStopped = returnTrue;
            if (e && !this.isSimulated) {
                e.stopPropagation();
            }
        },
        stopImmediatePropagation: function () {
            var e = this.originalEvent;
            this.isImmediatePropagationStopped = returnTrue;
            if (e && !this.isSimulated) {
                e.stopImmediatePropagation();
            }
            this.stopPropagation();
        }
    };
    jQuery.each({
        altKey: true,
        bubbles: true,
        cancelable: true,
        changedTouches: true,
        ctrlKey: true,
        detail: true,
        eventPhase: true,
        metaKey: true,
        pageX: true,
        pageY: true,
        shiftKey: true,
        view: true,
        'char': true,
        charCode: true,
        key: true,
        keyCode: true,
        button: true,
        buttons: true,
        clientX: true,
        clientY: true,
        offsetX: true,
        offsetY: true,
        pointerId: true,
        pointerType: true,
        screenX: true,
        screenY: true,
        targetTouches: true,
        toElement: true,
        touches: true,
        which: function (event) {
            var button = event.button;
            if (event.which == null && rkeyEvent.test(event.type)) {
                return event.charCode != null ? event.charCode : event.keyCode;
            }
            if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
                if (button & 1) {
                    return 1;
                }
                if (button & 2) {
                    return 3;
                }
                if (button & 4) {
                    return 2;
                }
                return 0;
            }
            return event.which;
        }
    }, jQuery.event.addProp);
    jQuery.each({
        mouseenter: 'mouseover',
        mouseleave: 'mouseout',
        pointerenter: 'pointerover',
        pointerleave: 'pointerout'
    }, function (orig, fix) {
        jQuery.event.special[orig] = {
            delegateType: fix,
            bindType: fix,
            handle: function (event) {
                var ret, target = this, related = event.relatedTarget, handleObj = event.handleObj;
                if (!related || related !== target && !jQuery.contains(target, related)) {
                    event.type = handleObj.origType;
                    ret = handleObj.handler.apply(this, arguments);
                    event.type = fix;
                }
                return ret;
            }
        };
    });
    jQuery.fn.extend({
        on: function (types, selector, data, fn) {
            return on(this, types, selector, data, fn);
        },
        one: function (types, selector, data, fn) {
            return on(this, types, selector, data, fn, 1);
        },
        off: function (types, selector, fn) {
            var handleObj, type;
            if (types && types.preventDefault && types.handleObj) {
                handleObj = types.handleObj;
                jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + '.' + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
                return this;
            }
            if (typeof types === 'object') {
                for (type in types) {
                    this.off(type, selector, types[type]);
                }
                return this;
            }
            if (selector === false || typeof selector === 'function') {
                fn = selector;
                selector = undefined;
            }
            if (fn === false) {
                fn = returnFalse;
            }
            return this.each(function () {
                jQuery.event.remove(this, types, fn, selector);
            });
        }
    });
    var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi, rnoInnerhtml = /<script|<style|<link/i, rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i, rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;
    function manipulationTarget(elem, content) {
        if (nodeName(elem, 'table') && nodeName(content.nodeType !== 11 ? content : content.firstChild, 'tr')) {
            return jQuery(elem).children('tbody')[0] || elem;
        }
        return elem;
    }
    function disableScript(elem) {
        elem.type = (elem.getAttribute('type') !== null) + '/' + elem.type;
        return elem;
    }
    function restoreScript(elem) {
        if ((elem.type || '').slice(0, 5) === 'true/') {
            elem.type = elem.type.slice(5);
        } else {
            elem.removeAttribute('type');
        }
        return elem;
    }
    function cloneCopyEvent(src, dest) {
        var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;
        if (dest.nodeType !== 1) {
            return;
        }
        if (dataPriv.hasData(src)) {
            pdataOld = dataPriv.access(src);
            pdataCur = dataPriv.set(dest, pdataOld);
            events = pdataOld.events;
            if (events) {
                delete pdataCur.handle;
                pdataCur.events = {};
                for (type in events) {
                    for (i = 0, l = events[type].length; i < l; i++) {
                        jQuery.event.add(dest, type, events[type][i]);
                    }
                }
            }
        }
        if (dataUser.hasData(src)) {
            udataOld = dataUser.access(src);
            udataCur = jQuery.extend({}, udataOld);
            dataUser.set(dest, udataCur);
        }
    }
    function fixInput(src, dest) {
        var nodeName = dest.nodeName.toLowerCase();
        if (nodeName === 'input' && rcheckableType.test(src.type)) {
            dest.checked = src.checked;
        } else if (nodeName === 'input' || nodeName === 'textarea') {
            dest.defaultValue = src.defaultValue;
        }
    }
    function domManip(collection, args, callback, ignored) {
        args = concat.apply([], args);
        var fragment, first, scripts, hasScripts, node, doc, i = 0, l = collection.length, iNoClone = l - 1, value = args[0], valueIsFunction = isFunction(value);
        if (valueIsFunction || l > 1 && typeof value === 'string' && !support.checkClone && rchecked.test(value)) {
            return collection.each(function (index) {
                var self = collection.eq(index);
                if (valueIsFunction) {
                    args[0] = value.call(this, index, self.html());
                }
                domManip(self, args, callback, ignored);
            });
        }
        if (l) {
            fragment = buildFragment(args, collection[0].ownerDocument, false, collection, ignored);
            first = fragment.firstChild;
            if (fragment.childNodes.length === 1) {
                fragment = first;
            }
            if (first || ignored) {
                scripts = jQuery.map(getAll(fragment, 'script'), disableScript);
                hasScripts = scripts.length;
                for (; i < l; i++) {
                    node = fragment;
                    if (i !== iNoClone) {
                        node = jQuery.clone(node, true, true);
                        if (hasScripts) {
                            jQuery.merge(scripts, getAll(node, 'script'));
                        }
                    }
                    callback.call(collection[i], node, i);
                }
                if (hasScripts) {
                    doc = scripts[scripts.length - 1].ownerDocument;
                    jQuery.map(scripts, restoreScript);
                    for (i = 0; i < hasScripts; i++) {
                        node = scripts[i];
                        if (rscriptType.test(node.type || '') && !dataPriv.access(node, 'globalEval') && jQuery.contains(doc, node)) {
                            if (node.src && (node.type || '').toLowerCase() !== 'module') {
                                if (jQuery._evalUrl) {
                                    jQuery._evalUrl(node.src);
                                }
                            } else {
                                DOMEval(node.textContent.replace(rcleanScript, ''), doc, node);
                            }
                        }
                    }
                }
            }
        }
        return collection;
    }
    function remove(elem, selector, keepData) {
        var node, nodes = selector ? jQuery.filter(selector, elem) : elem, i = 0;
        for (; (node = nodes[i]) != null; i++) {
            if (!keepData && node.nodeType === 1) {
                jQuery.cleanData(getAll(node));
            }
            if (node.parentNode) {
                if (keepData && jQuery.contains(node.ownerDocument, node)) {
                    setGlobalEval(getAll(node, 'script'));
                }
                node.parentNode.removeChild(node);
            }
        }
        return elem;
    }
    jQuery.extend({
        htmlPrefilter: function (html) {
            return html.replace(rxhtmlTag, '<$1></$2>');
        },
        clone: function (elem, dataAndEvents, deepDataAndEvents) {
            var i, l, srcElements, destElements, clone = elem.cloneNode(true), inPage = jQuery.contains(elem.ownerDocument, elem);
            if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
                destElements = getAll(clone);
                srcElements = getAll(elem);
                for (i = 0, l = srcElements.length; i < l; i++) {
                    fixInput(srcElements[i], destElements[i]);
                }
            }
            if (dataAndEvents) {
                if (deepDataAndEvents) {
                    srcElements = srcElements || getAll(elem);
                    destElements = destElements || getAll(clone);
                    for (i = 0, l = srcElements.length; i < l; i++) {
                        cloneCopyEvent(srcElements[i], destElements[i]);
                    }
                } else {
                    cloneCopyEvent(elem, clone);
                }
            }
            destElements = getAll(clone, 'script');
            if (destElements.length > 0) {
                setGlobalEval(destElements, !inPage && getAll(elem, 'script'));
            }
            return clone;
        },
        cleanData: function (elems) {
            var data, elem, type, special = jQuery.event.special, i = 0;
            for (; (elem = elems[i]) !== undefined; i++) {
                if (acceptData(elem)) {
                    if (data = elem[dataPriv.expando]) {
                        if (data.events) {
                            for (type in data.events) {
                                if (special[type]) {
                                    jQuery.event.remove(elem, type);
                                } else {
                                    jQuery.removeEvent(elem, type, data.handle);
                                }
                            }
                        }
                        elem[dataPriv.expando] = undefined;
                    }
                    if (elem[dataUser.expando]) {
                        elem[dataUser.expando] = undefined;
                    }
                }
            }
        }
    });
    jQuery.fn.extend({
        detach: function (selector) {
            return remove(this, selector, true);
        },
        remove: function (selector) {
            return remove(this, selector);
        },
        text: function (value) {
            return access(this, function (value) {
                return value === undefined ? jQuery.text(this) : this.empty().each(function () {
                    if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
                        this.textContent = value;
                    }
                });
            }, null, value, arguments.length);
        },
        append: function () {
            return domManip(this, arguments, function (elem) {
                if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
                    var target = manipulationTarget(this, elem);
                    target.appendChild(elem);
                }
            });
        },
        prepend: function () {
            return domManip(this, arguments, function (elem) {
                if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
                    var target = manipulationTarget(this, elem);
                    target.insertBefore(elem, target.firstChild);
                }
            });
        },
        before: function () {
            return domManip(this, arguments, function (elem) {
                if (this.parentNode) {
                    this.parentNode.insertBefore(elem, this);
                }
            });
        },
        after: function () {
            return domManip(this, arguments, function (elem) {
                if (this.parentNode) {
                    this.parentNode.insertBefore(elem, this.nextSibling);
                }
            });
        },
        empty: function () {
            var elem, i = 0;
            for (; (elem = this[i]) != null; i++) {
                if (elem.nodeType === 1) {
                    jQuery.cleanData(getAll(elem, false));
                    elem.textContent = '';
                }
            }
            return this;
        },
        clone: function (dataAndEvents, deepDataAndEvents) {
            dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
            deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
            return this.map(function () {
                return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
            });
        },
        html: function (value) {
            return access(this, function (value) {
                var elem = this[0] || {}, i = 0, l = this.length;
                if (value === undefined && elem.nodeType === 1) {
                    return elem.innerHTML;
                }
                if (typeof value === 'string' && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || [
                        '',
                        ''
                    ])[1].toLowerCase()]) {
                    value = jQuery.htmlPrefilter(value);
                    try {
                        for (; i < l; i++) {
                            elem = this[i] || {};
                            if (elem.nodeType === 1) {
                                jQuery.cleanData(getAll(elem, false));
                                elem.innerHTML = value;
                            }
                        }
                        elem = 0;
                    } catch (e) {
                    }
                }
                if (elem) {
                    this.empty().append(value);
                }
            }, null, value, arguments.length);
        },
        replaceWith: function () {
            var ignored = [];
            return domManip(this, arguments, function (elem) {
                var parent = this.parentNode;
                if (jQuery.inArray(this, ignored) < 0) {
                    jQuery.cleanData(getAll(this));
                    if (parent) {
                        parent.replaceChild(elem, this);
                    }
                }
            }, ignored);
        }
    });
    jQuery.each({
        appendTo: 'append',
        prependTo: 'prepend',
        insertBefore: 'before',
        insertAfter: 'after',
        replaceAll: 'replaceWith'
    }, function (name, original) {
        jQuery.fn[name] = function (selector) {
            var elems, ret = [], insert = jQuery(selector), last = insert.length - 1, i = 0;
            for (; i <= last; i++) {
                elems = i === last ? this : this.clone(true);
                jQuery(insert[i])[original](elems);
                push.apply(ret, elems.get());
            }
            return this.pushStack(ret);
        };
    });
    var rnumnonpx = new RegExp('^(' + pnum + ')(?!px)[a-z%]+$', 'i');
    var getStyles = function (elem) {
        var view = elem.ownerDocument.defaultView;
        if (!view || !view.opener) {
            view = window;
        }
        return view.getComputedStyle(elem);
    };
    var rboxStyle = new RegExp(cssExpand.join('|'), 'i');
    (function () {
        function computeStyleTests() {
            if (!div) {
                return;
            }
            container.style.cssText = 'position:absolute;left:-11111px;width:60px;' + 'margin-top:1px;padding:0;border:0';
            div.style.cssText = 'position:relative;display:block;box-sizing:border-box;overflow:scroll;' + 'margin:auto;border:1px;padding:1px;' + 'width:60%;top:1%';
            documentElement.appendChild(container).appendChild(div);
            var divStyle = window.getComputedStyle(div);
            pixelPositionVal = divStyle.top !== '1%';
            reliableMarginLeftVal = roundPixelMeasures(divStyle.marginLeft) === 12;
            div.style.right = '60%';
            pixelBoxStylesVal = roundPixelMeasures(divStyle.right) === 36;
            boxSizingReliableVal = roundPixelMeasures(divStyle.width) === 36;
            div.style.position = 'absolute';
            scrollboxSizeVal = div.offsetWidth === 36 || 'absolute';
            documentElement.removeChild(container);
            div = null;
        }
        function roundPixelMeasures(measure) {
            return Math.round(parseFloat(measure));
        }
        var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal, reliableMarginLeftVal, container = document.createElement('div'), div = document.createElement('div');
        if (!div.style) {
            return;
        }
        div.style.backgroundClip = 'content-box';
        div.cloneNode(true).style.backgroundClip = '';
        support.clearCloneStyle = div.style.backgroundClip === 'content-box';
        jQuery.extend(support, {
            boxSizingReliable: function () {
                computeStyleTests();
                return boxSizingReliableVal;
            },
            pixelBoxStyles: function () {
                computeStyleTests();
                return pixelBoxStylesVal;
            },
            pixelPosition: function () {
                computeStyleTests();
                return pixelPositionVal;
            },
            reliableMarginLeft: function () {
                computeStyleTests();
                return reliableMarginLeftVal;
            },
            scrollboxSize: function () {
                computeStyleTests();
                return scrollboxSizeVal;
            }
        });
    }());
    function curCSS(elem, name, computed) {
        var width, minWidth, maxWidth, ret, style = elem.style;
        computed = computed || getStyles(elem);
        if (computed) {
            ret = computed.getPropertyValue(name) || computed[name];
            if (ret === '' && !jQuery.contains(elem.ownerDocument, elem)) {
                ret = jQuery.style(elem, name);
            }
            if (!support.pixelBoxStyles() && rnumnonpx.test(ret) && rboxStyle.test(name)) {
                width = style.width;
                minWidth = style.minWidth;
                maxWidth = style.maxWidth;
                style.minWidth = style.maxWidth = style.width = ret;
                ret = computed.width;
                style.width = width;
                style.minWidth = minWidth;
                style.maxWidth = maxWidth;
            }
        }
        return ret !== undefined ? ret + '' : ret;
    }
    function addGetHookIf(conditionFn, hookFn) {
        return {
            get: function () {
                if (conditionFn()) {
                    delete this.get;
                    return;
                }
                return (this.get = hookFn).apply(this, arguments);
            }
        };
    }
    var rdisplayswap = /^(none|table(?!-c[ea]).+)/, rcustomProp = /^--/, cssShow = {
            position: 'absolute',
            visibility: 'hidden',
            display: 'block'
        }, cssNormalTransform = {
            letterSpacing: '0',
            fontWeight: '400'
        }, cssPrefixes = [
            'Webkit',
            'Moz',
            'ms'
        ], emptyStyle = document.createElement('div').style;
    function vendorPropName(name) {
        if (name in emptyStyle) {
            return name;
        }
        var capName = name[0].toUpperCase() + name.slice(1), i = cssPrefixes.length;
        while (i--) {
            name = cssPrefixes[i] + capName;
            if (name in emptyStyle) {
                return name;
            }
        }
    }
    function finalPropName(name) {
        var ret = jQuery.cssProps[name];
        if (!ret) {
            ret = jQuery.cssProps[name] = vendorPropName(name) || name;
        }
        return ret;
    }
    function setPositiveNumber(elem, value, subtract) {
        var matches = rcssNum.exec(value);
        return matches ? Math.max(0, matches[2] - (subtract || 0)) + (matches[3] || 'px') : value;
    }
    function boxModelAdjustment(elem, dimension, box, isBorderBox, styles, computedVal) {
        var i = dimension === 'width' ? 1 : 0, extra = 0, delta = 0;
        if (box === (isBorderBox ? 'border' : 'content')) {
            return 0;
        }
        for (; i < 4; i += 2) {
            if (box === 'margin') {
                delta += jQuery.css(elem, box + cssExpand[i], true, styles);
            }
            if (!isBorderBox) {
                delta += jQuery.css(elem, 'padding' + cssExpand[i], true, styles);
                if (box !== 'padding') {
                    delta += jQuery.css(elem, 'border' + cssExpand[i] + 'Width', true, styles);
                } else {
                    extra += jQuery.css(elem, 'border' + cssExpand[i] + 'Width', true, styles);
                }
            } else {
                if (box === 'content') {
                    delta -= jQuery.css(elem, 'padding' + cssExpand[i], true, styles);
                }
                if (box !== 'margin') {
                    delta -= jQuery.css(elem, 'border' + cssExpand[i] + 'Width', true, styles);
                }
            }
        }
        if (!isBorderBox && computedVal >= 0) {
            delta += Math.max(0, Math.ceil(elem['offset' + dimension[0].toUpperCase() + dimension.slice(1)] - computedVal - delta - extra - 0.5));
        }
        return delta;
    }
    function getWidthOrHeight(elem, dimension, extra) {
        var styles = getStyles(elem), val = curCSS(elem, dimension, styles), isBorderBox = jQuery.css(elem, 'boxSizing', false, styles) === 'border-box', valueIsBorderBox = isBorderBox;
        if (rnumnonpx.test(val)) {
            if (!extra) {
                return val;
            }
            val = 'auto';
        }
        valueIsBorderBox = valueIsBorderBox && (support.boxSizingReliable() || val === elem.style[dimension]);
        if (val === 'auto' || !parseFloat(val) && jQuery.css(elem, 'display', false, styles) === 'inline') {
            val = elem['offset' + dimension[0].toUpperCase() + dimension.slice(1)];
            valueIsBorderBox = true;
        }
        val = parseFloat(val) || 0;
        return val + boxModelAdjustment(elem, dimension, extra || (isBorderBox ? 'border' : 'content'), valueIsBorderBox, styles, val) + 'px';
    }
    jQuery.extend({
        cssHooks: {
            opacity: {
                get: function (elem, computed) {
                    if (computed) {
                        var ret = curCSS(elem, 'opacity');
                        return ret === '' ? '1' : ret;
                    }
                }
            }
        },
        cssNumber: {
            'animationIterationCount': true,
            'columnCount': true,
            'fillOpacity': true,
            'flexGrow': true,
            'flexShrink': true,
            'fontWeight': true,
            'lineHeight': true,
            'opacity': true,
            'order': true,
            'orphans': true,
            'widows': true,
            'zIndex': true,
            'zoom': true
        },
        cssProps: {},
        style: function (elem, name, value, extra) {
            if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
                return;
            }
            var ret, type, hooks, origName = camelCase(name), isCustomProp = rcustomProp.test(name), style = elem.style;
            if (!isCustomProp) {
                name = finalPropName(origName);
            }
            hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
            if (value !== undefined) {
                type = typeof value;
                if (type === 'string' && (ret = rcssNum.exec(value)) && ret[1]) {
                    value = adjustCSS(elem, name, ret);
                    type = 'number';
                }
                if (value == null || value !== value) {
                    return;
                }
                if (type === 'number') {
                    value += ret && ret[3] || (jQuery.cssNumber[origName] ? '' : 'px');
                }
                if (!support.clearCloneStyle && value === '' && name.indexOf('background') === 0) {
                    style[name] = 'inherit';
                }
                if (!hooks || !('set' in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
                    if (isCustomProp) {
                        style.setProperty(name, value);
                    } else {
                        style[name] = value;
                    }
                }
            } else {
                if (hooks && 'get' in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
                    return ret;
                }
                return style[name];
            }
        },
        css: function (elem, name, extra, styles) {
            var val, num, hooks, origName = camelCase(name), isCustomProp = rcustomProp.test(name);
            if (!isCustomProp) {
                name = finalPropName(origName);
            }
            hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
            if (hooks && 'get' in hooks) {
                val = hooks.get(elem, true, extra);
            }
            if (val === undefined) {
                val = curCSS(elem, name, styles);
            }
            if (val === 'normal' && name in cssNormalTransform) {
                val = cssNormalTransform[name];
            }
            if (extra === '' || extra) {
                num = parseFloat(val);
                return extra === true || isFinite(num) ? num || 0 : val;
            }
            return val;
        }
    });
    jQuery.each([
        'height',
        'width'
    ], function (i, dimension) {
        jQuery.cssHooks[dimension] = {
            get: function (elem, computed, extra) {
                if (computed) {
                    return rdisplayswap.test(jQuery.css(elem, 'display')) && (!elem.getClientRects().length || !elem.getBoundingClientRect().width) ? swap(elem, cssShow, function () {
                        return getWidthOrHeight(elem, dimension, extra);
                    }) : getWidthOrHeight(elem, dimension, extra);
                }
            },
            set: function (elem, value, extra) {
                var matches, styles = getStyles(elem), isBorderBox = jQuery.css(elem, 'boxSizing', false, styles) === 'border-box', subtract = extra && boxModelAdjustment(elem, dimension, extra, isBorderBox, styles);
                if (isBorderBox && support.scrollboxSize() === styles.position) {
                    subtract -= Math.ceil(elem['offset' + dimension[0].toUpperCase() + dimension.slice(1)] - parseFloat(styles[dimension]) - boxModelAdjustment(elem, dimension, 'border', false, styles) - 0.5);
                }
                if (subtract && (matches = rcssNum.exec(value)) && (matches[3] || 'px') !== 'px') {
                    elem.style[dimension] = value;
                    value = jQuery.css(elem, dimension);
                }
                return setPositiveNumber(elem, value, subtract);
            }
        };
    });
    jQuery.cssHooks.marginLeft = addGetHookIf(support.reliableMarginLeft, function (elem, computed) {
        if (computed) {
            return (parseFloat(curCSS(elem, 'marginLeft')) || elem.getBoundingClientRect().left - swap(elem, { marginLeft: 0 }, function () {
                return elem.getBoundingClientRect().left;
            })) + 'px';
        }
    });
    jQuery.each({
        margin: '',
        padding: '',
        border: 'Width'
    }, function (prefix, suffix) {
        jQuery.cssHooks[prefix + suffix] = {
            expand: function (value) {
                var i = 0, expanded = {}, parts = typeof value === 'string' ? value.split(' ') : [value];
                for (; i < 4; i++) {
                    expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
                }
                return expanded;
            }
        };
        if (prefix !== 'margin') {
            jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
        }
    });
    jQuery.fn.extend({
        css: function (name, value) {
            return access(this, function (elem, name, value) {
                var styles, len, map = {}, i = 0;
                if (Array.isArray(name)) {
                    styles = getStyles(elem);
                    len = name.length;
                    for (; i < len; i++) {
                        map[name[i]] = jQuery.css(elem, name[i], false, styles);
                    }
                    return map;
                }
                return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
            }, name, value, arguments.length > 1);
        }
    });
    function Tween(elem, options, prop, end, easing) {
        return new Tween.prototype.init(elem, options, prop, end, easing);
    }
    jQuery.Tween = Tween;
    Tween.prototype = {
        constructor: Tween,
        init: function (elem, options, prop, end, easing, unit) {
            this.elem = elem;
            this.prop = prop;
            this.easing = easing || jQuery.easing._default;
            this.options = options;
            this.start = this.now = this.cur();
            this.end = end;
            this.unit = unit || (jQuery.cssNumber[prop] ? '' : 'px');
        },
        cur: function () {
            var hooks = Tween.propHooks[this.prop];
            return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
        },
        run: function (percent) {
            var eased, hooks = Tween.propHooks[this.prop];
            if (this.options.duration) {
                this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
            } else {
                this.pos = eased = percent;
            }
            this.now = (this.end - this.start) * eased + this.start;
            if (this.options.step) {
                this.options.step.call(this.elem, this.now, this);
            }
            if (hooks && hooks.set) {
                hooks.set(this);
            } else {
                Tween.propHooks._default.set(this);
            }
            return this;
        }
    };
    Tween.prototype.init.prototype = Tween.prototype;
    Tween.propHooks = {
        _default: {
            get: function (tween) {
                var result;
                if (tween.elem.nodeType !== 1 || tween.elem[tween.prop] != null && tween.elem.style[tween.prop] == null) {
                    return tween.elem[tween.prop];
                }
                result = jQuery.css(tween.elem, tween.prop, '');
                return !result || result === 'auto' ? 0 : result;
            },
            set: function (tween) {
                if (jQuery.fx.step[tween.prop]) {
                    jQuery.fx.step[tween.prop](tween);
                } else if (tween.elem.nodeType === 1 && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
                    jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
                } else {
                    tween.elem[tween.prop] = tween.now;
                }
            }
        }
    };
    Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
        set: function (tween) {
            if (tween.elem.nodeType && tween.elem.parentNode) {
                tween.elem[tween.prop] = tween.now;
            }
        }
    };
    jQuery.easing = {
        linear: function (p) {
            return p;
        },
        swing: function (p) {
            return 0.5 - Math.cos(p * Math.PI) / 2;
        },
        _default: 'swing'
    };
    jQuery.fx = Tween.prototype.init;
    jQuery.fx.step = {};
    var fxNow, inProgress, rfxtypes = /^(?:toggle|show|hide)$/, rrun = /queueHooks$/;
    function schedule() {
        if (inProgress) {
            if (document.hidden === false && window.requestAnimationFrame) {
                window.requestAnimationFrame(schedule);
            } else {
                window.setTimeout(schedule, jQuery.fx.interval);
            }
            jQuery.fx.tick();
        }
    }
    function createFxNow() {
        window.setTimeout(function () {
            fxNow = undefined;
        });
        return fxNow = Date.now();
    }
    function genFx(type, includeWidth) {
        var which, i = 0, attrs = { height: type };
        includeWidth = includeWidth ? 1 : 0;
        for (; i < 4; i += 2 - includeWidth) {
            which = cssExpand[i];
            attrs['margin' + which] = attrs['padding' + which] = type;
        }
        if (includeWidth) {
            attrs.opacity = attrs.width = type;
        }
        return attrs;
    }
    function createTween(value, prop, animation) {
        var tween, collection = (Animation.tweeners[prop] || []).concat(Animation.tweeners['*']), index = 0, length = collection.length;
        for (; index < length; index++) {
            if (tween = collection[index].call(animation, prop, value)) {
                return tween;
            }
        }
    }
    function defaultPrefilter(elem, props, opts) {
        var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display, isBox = 'width' in props || 'height' in props, anim = this, orig = {}, style = elem.style, hidden = elem.nodeType && isHiddenWithinTree(elem), dataShow = dataPriv.get(elem, 'fxshow');
        if (!opts.queue) {
            hooks = jQuery._queueHooks(elem, 'fx');
            if (hooks.unqueued == null) {
                hooks.unqueued = 0;
                oldfire = hooks.empty.fire;
                hooks.empty.fire = function () {
                    if (!hooks.unqueued) {
                        oldfire();
                    }
                };
            }
            hooks.unqueued++;
            anim.always(function () {
                anim.always(function () {
                    hooks.unqueued--;
                    if (!jQuery.queue(elem, 'fx').length) {
                        hooks.empty.fire();
                    }
                });
            });
        }
        for (prop in props) {
            value = props[prop];
            if (rfxtypes.test(value)) {
                delete props[prop];
                toggle = toggle || value === 'toggle';
                if (value === (hidden ? 'hide' : 'show')) {
                    if (value === 'show' && dataShow && dataShow[prop] !== undefined) {
                        hidden = true;
                    } else {
                        continue;
                    }
                }
                orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
            }
        }
        propTween = !jQuery.isEmptyObject(props);
        if (!propTween && jQuery.isEmptyObject(orig)) {
            return;
        }
        if (isBox && elem.nodeType === 1) {
            opts.overflow = [
                style.overflow,
                style.overflowX,
                style.overflowY
            ];
            restoreDisplay = dataShow && dataShow.display;
            if (restoreDisplay == null) {
                restoreDisplay = dataPriv.get(elem, 'display');
            }
            display = jQuery.css(elem, 'display');
            if (display === 'none') {
                if (restoreDisplay) {
                    display = restoreDisplay;
                } else {
                    showHide([elem], true);
                    restoreDisplay = elem.style.display || restoreDisplay;
                    display = jQuery.css(elem, 'display');
                    showHide([elem]);
                }
            }
            if (display === 'inline' || display === 'inline-block' && restoreDisplay != null) {
                if (jQuery.css(elem, 'float') === 'none') {
                    if (!propTween) {
                        anim.done(function () {
                            style.display = restoreDisplay;
                        });
                        if (restoreDisplay == null) {
                            display = style.display;
                            restoreDisplay = display === 'none' ? '' : display;
                        }
                    }
                    style.display = 'inline-block';
                }
            }
        }
        if (opts.overflow) {
            style.overflow = 'hidden';
            anim.always(function () {
                style.overflow = opts.overflow[0];
                style.overflowX = opts.overflow[1];
                style.overflowY = opts.overflow[2];
            });
        }
        propTween = false;
        for (prop in orig) {
            if (!propTween) {
                if (dataShow) {
                    if ('hidden' in dataShow) {
                        hidden = dataShow.hidden;
                    }
                } else {
                    dataShow = dataPriv.access(elem, 'fxshow', { display: restoreDisplay });
                }
                if (toggle) {
                    dataShow.hidden = !hidden;
                }
                if (hidden) {
                    showHide([elem], true);
                }
                anim.done(function () {
                    if (!hidden) {
                        showHide([elem]);
                    }
                    dataPriv.remove(elem, 'fxshow');
                    for (prop in orig) {
                        jQuery.style(elem, prop, orig[prop]);
                    }
                });
            }
            propTween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
            if (!(prop in dataShow)) {
                dataShow[prop] = propTween.start;
                if (hidden) {
                    propTween.end = propTween.start;
                    propTween.start = 0;
                }
            }
        }
    }
    function propFilter(props, specialEasing) {
        var index, name, easing, value, hooks;
        for (index in props) {
            name = camelCase(index);
            easing = specialEasing[name];
            value = props[index];
            if (Array.isArray(value)) {
                easing = value[1];
                value = props[index] = value[0];
            }
            if (index !== name) {
                props[name] = value;
                delete props[index];
            }
            hooks = jQuery.cssHooks[name];
            if (hooks && 'expand' in hooks) {
                value = hooks.expand(value);
                delete props[name];
                for (index in value) {
                    if (!(index in props)) {
                        props[index] = value[index];
                        specialEasing[index] = easing;
                    }
                }
            } else {
                specialEasing[name] = easing;
            }
        }
    }
    function Animation(elem, properties, options) {
        var result, stopped, index = 0, length = Animation.prefilters.length, deferred = jQuery.Deferred().always(function () {
                delete tick.elem;
            }), tick = function () {
                if (stopped) {
                    return false;
                }
                var currentTime = fxNow || createFxNow(), remaining = Math.max(0, animation.startTime + animation.duration - currentTime), temp = remaining / animation.duration || 0, percent = 1 - temp, index = 0, length = animation.tweens.length;
                for (; index < length; index++) {
                    animation.tweens[index].run(percent);
                }
                deferred.notifyWith(elem, [
                    animation,
                    percent,
                    remaining
                ]);
                if (percent < 1 && length) {
                    return remaining;
                }
                if (!length) {
                    deferred.notifyWith(elem, [
                        animation,
                        1,
                        0
                    ]);
                }
                deferred.resolveWith(elem, [animation]);
                return false;
            }, animation = deferred.promise({
                elem: elem,
                props: jQuery.extend({}, properties),
                opts: jQuery.extend(true, {
                    specialEasing: {},
                    easing: jQuery.easing._default
                }, options),
                originalProperties: properties,
                originalOptions: options,
                startTime: fxNow || createFxNow(),
                duration: options.duration,
                tweens: [],
                createTween: function (prop, end) {
                    var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
                    animation.tweens.push(tween);
                    return tween;
                },
                stop: function (gotoEnd) {
                    var index = 0, length = gotoEnd ? animation.tweens.length : 0;
                    if (stopped) {
                        return this;
                    }
                    stopped = true;
                    for (; index < length; index++) {
                        animation.tweens[index].run(1);
                    }
                    if (gotoEnd) {
                        deferred.notifyWith(elem, [
                            animation,
                            1,
                            0
                        ]);
                        deferred.resolveWith(elem, [
                            animation,
                            gotoEnd
                        ]);
                    } else {
                        deferred.rejectWith(elem, [
                            animation,
                            gotoEnd
                        ]);
                    }
                    return this;
                }
            }), props = animation.props;
        propFilter(props, animation.opts.specialEasing);
        for (; index < length; index++) {
            result = Animation.prefilters[index].call(animation, elem, props, animation.opts);
            if (result) {
                if (isFunction(result.stop)) {
                    jQuery._queueHooks(animation.elem, animation.opts.queue).stop = result.stop.bind(result);
                }
                return result;
            }
        }
        jQuery.map(props, createTween, animation);
        if (isFunction(animation.opts.start)) {
            animation.opts.start.call(elem, animation);
        }
        animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
        jQuery.fx.timer(jQuery.extend(tick, {
            elem: elem,
            anim: animation,
            queue: animation.opts.queue
        }));
        return animation;
    }
    jQuery.Animation = jQuery.extend(Animation, {
        tweeners: {
            '*': [function (prop, value) {
                    var tween = this.createTween(prop, value);
                    adjustCSS(tween.elem, prop, rcssNum.exec(value), tween);
                    return tween;
                }]
        },
        tweener: function (props, callback) {
            if (isFunction(props)) {
                callback = props;
                props = ['*'];
            } else {
                props = props.match(rnothtmlwhite);
            }
            var prop, index = 0, length = props.length;
            for (; index < length; index++) {
                prop = props[index];
                Animation.tweeners[prop] = Animation.tweeners[prop] || [];
                Animation.tweeners[prop].unshift(callback);
            }
        },
        prefilters: [defaultPrefilter],
        prefilter: function (callback, prepend) {
            if (prepend) {
                Animation.prefilters.unshift(callback);
            } else {
                Animation.prefilters.push(callback);
            }
        }
    });
    jQuery.speed = function (speed, easing, fn) {
        var opt = speed && typeof speed === 'object' ? jQuery.extend({}, speed) : {
            complete: fn || !fn && easing || isFunction(speed) && speed,
            duration: speed,
            easing: fn && easing || easing && !isFunction(easing) && easing
        };
        if (jQuery.fx.off) {
            opt.duration = 0;
        } else {
            if (typeof opt.duration !== 'number') {
                if (opt.duration in jQuery.fx.speeds) {
                    opt.duration = jQuery.fx.speeds[opt.duration];
                } else {
                    opt.duration = jQuery.fx.speeds._default;
                }
            }
        }
        if (opt.queue == null || opt.queue === true) {
            opt.queue = 'fx';
        }
        opt.old = opt.complete;
        opt.complete = function () {
            if (isFunction(opt.old)) {
                opt.old.call(this);
            }
            if (opt.queue) {
                jQuery.dequeue(this, opt.queue);
            }
        };
        return opt;
    };
    jQuery.fn.extend({
        fadeTo: function (speed, to, easing, callback) {
            return this.filter(isHiddenWithinTree).css('opacity', 0).show().end().animate({ opacity: to }, speed, easing, callback);
        },
        animate: function (prop, speed, easing, callback) {
            var empty = jQuery.isEmptyObject(prop), optall = jQuery.speed(speed, easing, callback), doAnimation = function () {
                    var anim = Animation(this, jQuery.extend({}, prop), optall);
                    if (empty || dataPriv.get(this, 'finish')) {
                        anim.stop(true);
                    }
                };
            doAnimation.finish = doAnimation;
            return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
        },
        stop: function (type, clearQueue, gotoEnd) {
            var stopQueue = function (hooks) {
                var stop = hooks.stop;
                delete hooks.stop;
                stop(gotoEnd);
            };
            if (typeof type !== 'string') {
                gotoEnd = clearQueue;
                clearQueue = type;
                type = undefined;
            }
            if (clearQueue && type !== false) {
                this.queue(type || 'fx', []);
            }
            return this.each(function () {
                var dequeue = true, index = type != null && type + 'queueHooks', timers = jQuery.timers, data = dataPriv.get(this);
                if (index) {
                    if (data[index] && data[index].stop) {
                        stopQueue(data[index]);
                    }
                } else {
                    for (index in data) {
                        if (data[index] && data[index].stop && rrun.test(index)) {
                            stopQueue(data[index]);
                        }
                    }
                }
                for (index = timers.length; index--;) {
                    if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
                        timers[index].anim.stop(gotoEnd);
                        dequeue = false;
                        timers.splice(index, 1);
                    }
                }
                if (dequeue || !gotoEnd) {
                    jQuery.dequeue(this, type);
                }
            });
        },
        finish: function (type) {
            if (type !== false) {
                type = type || 'fx';
            }
            return this.each(function () {
                var index, data = dataPriv.get(this), queue = data[type + 'queue'], hooks = data[type + 'queueHooks'], timers = jQuery.timers, length = queue ? queue.length : 0;
                data.finish = true;
                jQuery.queue(this, type, []);
                if (hooks && hooks.stop) {
                    hooks.stop.call(this, true);
                }
                for (index = timers.length; index--;) {
                    if (timers[index].elem === this && timers[index].queue === type) {
                        timers[index].anim.stop(true);
                        timers.splice(index, 1);
                    }
                }
                for (index = 0; index < length; index++) {
                    if (queue[index] && queue[index].finish) {
                        queue[index].finish.call(this);
                    }
                }
                delete data.finish;
            });
        }
    });
    jQuery.each([
        'toggle',
        'show',
        'hide'
    ], function (i, name) {
        var cssFn = jQuery.fn[name];
        jQuery.fn[name] = function (speed, easing, callback) {
            return speed == null || typeof speed === 'boolean' ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
        };
    });
    jQuery.each({
        slideDown: genFx('show'),
        slideUp: genFx('hide'),
        slideToggle: genFx('toggle'),
        fadeIn: { opacity: 'show' },
        fadeOut: { opacity: 'hide' },
        fadeToggle: { opacity: 'toggle' }
    }, function (name, props) {
        jQuery.fn[name] = function (speed, easing, callback) {
            return this.animate(props, speed, easing, callback);
        };
    });
    jQuery.timers = [];
    jQuery.fx.tick = function () {
        var timer, i = 0, timers = jQuery.timers;
        fxNow = Date.now();
        for (; i < timers.length; i++) {
            timer = timers[i];
            if (!timer() && timers[i] === timer) {
                timers.splice(i--, 1);
            }
        }
        if (!timers.length) {
            jQuery.fx.stop();
        }
        fxNow = undefined;
    };
    jQuery.fx.timer = function (timer) {
        jQuery.timers.push(timer);
        jQuery.fx.start();
    };
    jQuery.fx.interval = 13;
    jQuery.fx.start = function () {
        if (inProgress) {
            return;
        }
        inProgress = true;
        schedule();
    };
    jQuery.fx.stop = function () {
        inProgress = null;
    };
    jQuery.fx.speeds = {
        slow: 600,
        fast: 200,
        _default: 400
    };
    jQuery.fn.delay = function (time, type) {
        time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
        type = type || 'fx';
        return this.queue(type, function (next, hooks) {
            var timeout = window.setTimeout(next, time);
            hooks.stop = function () {
                window.clearTimeout(timeout);
            };
        });
    };
    (function () {
        var input = document.createElement('input'), select = document.createElement('select'), opt = select.appendChild(document.createElement('option'));
        input.type = 'checkbox';
        support.checkOn = input.value !== '';
        support.optSelected = opt.selected;
        input = document.createElement('input');
        input.value = 't';
        input.type = 'radio';
        support.radioValue = input.value === 't';
    }());
    var boolHook, attrHandle = jQuery.expr.attrHandle;
    jQuery.fn.extend({
        attr: function (name, value) {
            return access(this, jQuery.attr, name, value, arguments.length > 1);
        },
        removeAttr: function (name) {
            return this.each(function () {
                jQuery.removeAttr(this, name);
            });
        }
    });
    jQuery.extend({
        attr: function (elem, name, value) {
            var ret, hooks, nType = elem.nodeType;
            if (nType === 3 || nType === 8 || nType === 2) {
                return;
            }
            if (typeof elem.getAttribute === 'undefined') {
                return jQuery.prop(elem, name, value);
            }
            if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
                hooks = jQuery.attrHooks[name.toLowerCase()] || (jQuery.expr.match.bool.test(name) ? boolHook : undefined);
            }
            if (value !== undefined) {
                if (value === null) {
                    jQuery.removeAttr(elem, name);
                    return;
                }
                if (hooks && 'set' in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
                    return ret;
                }
                elem.setAttribute(name, value + '');
                return value;
            }
            if (hooks && 'get' in hooks && (ret = hooks.get(elem, name)) !== null) {
                return ret;
            }
            ret = jQuery.find.attr(elem, name);
            return ret == null ? undefined : ret;
        },
        attrHooks: {
            type: {
                set: function (elem, value) {
                    if (!support.radioValue && value === 'radio' && nodeName(elem, 'input')) {
                        var val = elem.value;
                        elem.setAttribute('type', value);
                        if (val) {
                            elem.value = val;
                        }
                        return value;
                    }
                }
            }
        },
        removeAttr: function (elem, value) {
            var name, i = 0, attrNames = value && value.match(rnothtmlwhite);
            if (attrNames && elem.nodeType === 1) {
                while (name = attrNames[i++]) {
                    elem.removeAttribute(name);
                }
            }
        }
    });
    boolHook = {
        set: function (elem, value, name) {
            if (value === false) {
                jQuery.removeAttr(elem, name);
            } else {
                elem.setAttribute(name, name);
            }
            return name;
        }
    };
    jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function (i, name) {
        var getter = attrHandle[name] || jQuery.find.attr;
        attrHandle[name] = function (elem, name, isXML) {
            var ret, handle, lowercaseName = name.toLowerCase();
            if (!isXML) {
                handle = attrHandle[lowercaseName];
                attrHandle[lowercaseName] = ret;
                ret = getter(elem, name, isXML) != null ? lowercaseName : null;
                attrHandle[lowercaseName] = handle;
            }
            return ret;
        };
    });
    var rfocusable = /^(?:input|select|textarea|button)$/i, rclickable = /^(?:a|area)$/i;
    jQuery.fn.extend({
        prop: function (name, value) {
            return access(this, jQuery.prop, name, value, arguments.length > 1);
        },
        removeProp: function (name) {
            return this.each(function () {
                delete this[jQuery.propFix[name] || name];
            });
        }
    });
    jQuery.extend({
        prop: function (elem, name, value) {
            var ret, hooks, nType = elem.nodeType;
            if (nType === 3 || nType === 8 || nType === 2) {
                return;
            }
            if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
                name = jQuery.propFix[name] || name;
                hooks = jQuery.propHooks[name];
            }
            if (value !== undefined) {
                if (hooks && 'set' in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
                    return ret;
                }
                return elem[name] = value;
            }
            if (hooks && 'get' in hooks && (ret = hooks.get(elem, name)) !== null) {
                return ret;
            }
            return elem[name];
        },
        propHooks: {
            tabIndex: {
                get: function (elem) {
                    var tabindex = jQuery.find.attr(elem, 'tabindex');
                    if (tabindex) {
                        return parseInt(tabindex, 10);
                    }
                    if (rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href) {
                        return 0;
                    }
                    return -1;
                }
            }
        },
        propFix: {
            'for': 'htmlFor',
            'class': 'className'
        }
    });
    if (!support.optSelected) {
        jQuery.propHooks.selected = {
            get: function (elem) {
                var parent = elem.parentNode;
                if (parent && parent.parentNode) {
                    parent.parentNode.selectedIndex;
                }
                return null;
            },
            set: function (elem) {
                var parent = elem.parentNode;
                if (parent) {
                    parent.selectedIndex;
                    if (parent.parentNode) {
                        parent.parentNode.selectedIndex;
                    }
                }
            }
        };
    }
    jQuery.each([
        'tabIndex',
        'readOnly',
        'maxLength',
        'cellSpacing',
        'cellPadding',
        'rowSpan',
        'colSpan',
        'useMap',
        'frameBorder',
        'contentEditable'
    ], function () {
        jQuery.propFix[this.toLowerCase()] = this;
    });
    function stripAndCollapse(value) {
        var tokens = value.match(rnothtmlwhite) || [];
        return tokens.join(' ');
    }
    function getClass(elem) {
        return elem.getAttribute && elem.getAttribute('class') || '';
    }
    function classesToArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.match(rnothtmlwhite) || [];
        }
        return [];
    }
    jQuery.fn.extend({
        addClass: function (value) {
            var classes, elem, cur, curValue, clazz, j, finalValue, i = 0;
            if (isFunction(value)) {
                return this.each(function (j) {
                    jQuery(this).addClass(value.call(this, j, getClass(this)));
                });
            }
            classes = classesToArray(value);
            if (classes.length) {
                while (elem = this[i++]) {
                    curValue = getClass(elem);
                    cur = elem.nodeType === 1 && ' ' + stripAndCollapse(curValue) + ' ';
                    if (cur) {
                        j = 0;
                        while (clazz = classes[j++]) {
                            if (cur.indexOf(' ' + clazz + ' ') < 0) {
                                cur += clazz + ' ';
                            }
                        }
                        finalValue = stripAndCollapse(cur);
                        if (curValue !== finalValue) {
                            elem.setAttribute('class', finalValue);
                        }
                    }
                }
            }
            return this;
        },
        removeClass: function (value) {
            var classes, elem, cur, curValue, clazz, j, finalValue, i = 0;
            if (isFunction(value)) {
                return this.each(function (j) {
                    jQuery(this).removeClass(value.call(this, j, getClass(this)));
                });
            }
            if (!arguments.length) {
                return this.attr('class', '');
            }
            classes = classesToArray(value);
            if (classes.length) {
                while (elem = this[i++]) {
                    curValue = getClass(elem);
                    cur = elem.nodeType === 1 && ' ' + stripAndCollapse(curValue) + ' ';
                    if (cur) {
                        j = 0;
                        while (clazz = classes[j++]) {
                            while (cur.indexOf(' ' + clazz + ' ') > -1) {
                                cur = cur.replace(' ' + clazz + ' ', ' ');
                            }
                        }
                        finalValue = stripAndCollapse(cur);
                        if (curValue !== finalValue) {
                            elem.setAttribute('class', finalValue);
                        }
                    }
                }
            }
            return this;
        },
        toggleClass: function (value, stateVal) {
            var type = typeof value, isValidValue = type === 'string' || Array.isArray(value);
            if (typeof stateVal === 'boolean' && isValidValue) {
                return stateVal ? this.addClass(value) : this.removeClass(value);
            }
            if (isFunction(value)) {
                return this.each(function (i) {
                    jQuery(this).toggleClass(value.call(this, i, getClass(this), stateVal), stateVal);
                });
            }
            return this.each(function () {
                var className, i, self, classNames;
                if (isValidValue) {
                    i = 0;
                    self = jQuery(this);
                    classNames = classesToArray(value);
                    while (className = classNames[i++]) {
                        if (self.hasClass(className)) {
                            self.removeClass(className);
                        } else {
                            self.addClass(className);
                        }
                    }
                } else if (value === undefined || type === 'boolean') {
                    className = getClass(this);
                    if (className) {
                        dataPriv.set(this, '__className__', className);
                    }
                    if (this.setAttribute) {
                        this.setAttribute('class', className || value === false ? '' : dataPriv.get(this, '__className__') || '');
                    }
                }
            });
        },
        hasClass: function (selector) {
            var className, elem, i = 0;
            className = ' ' + selector + ' ';
            while (elem = this[i++]) {
                if (elem.nodeType === 1 && (' ' + stripAndCollapse(getClass(elem)) + ' ').indexOf(className) > -1) {
                    return true;
                }
            }
            return false;
        }
    });
    var rreturn = /\r/g;
    jQuery.fn.extend({
        val: function (value) {
            var hooks, ret, valueIsFunction, elem = this[0];
            if (!arguments.length) {
                if (elem) {
                    hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
                    if (hooks && 'get' in hooks && (ret = hooks.get(elem, 'value')) !== undefined) {
                        return ret;
                    }
                    ret = elem.value;
                    if (typeof ret === 'string') {
                        return ret.replace(rreturn, '');
                    }
                    return ret == null ? '' : ret;
                }
                return;
            }
            valueIsFunction = isFunction(value);
            return this.each(function (i) {
                var val;
                if (this.nodeType !== 1) {
                    return;
                }
                if (valueIsFunction) {
                    val = value.call(this, i, jQuery(this).val());
                } else {
                    val = value;
                }
                if (val == null) {
                    val = '';
                } else if (typeof val === 'number') {
                    val += '';
                } else if (Array.isArray(val)) {
                    val = jQuery.map(val, function (value) {
                        return value == null ? '' : value + '';
                    });
                }
                hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
                if (!hooks || !('set' in hooks) || hooks.set(this, val, 'value') === undefined) {
                    this.value = val;
                }
            });
        }
    });
    jQuery.extend({
        valHooks: {
            option: {
                get: function (elem) {
                    var val = jQuery.find.attr(elem, 'value');
                    return val != null ? val : stripAndCollapse(jQuery.text(elem));
                }
            },
            select: {
                get: function (elem) {
                    var value, option, i, options = elem.options, index = elem.selectedIndex, one = elem.type === 'select-one', values = one ? null : [], max = one ? index + 1 : options.length;
                    if (index < 0) {
                        i = max;
                    } else {
                        i = one ? index : 0;
                    }
                    for (; i < max; i++) {
                        option = options[i];
                        if ((option.selected || i === index) && !option.disabled && (!option.parentNode.disabled || !nodeName(option.parentNode, 'optgroup'))) {
                            value = jQuery(option).val();
                            if (one) {
                                return value;
                            }
                            values.push(value);
                        }
                    }
                    return values;
                },
                set: function (elem, value) {
                    var optionSet, option, options = elem.options, values = jQuery.makeArray(value), i = options.length;
                    while (i--) {
                        option = options[i];
                        if (option.selected = jQuery.inArray(jQuery.valHooks.option.get(option), values) > -1) {
                            optionSet = true;
                        }
                    }
                    if (!optionSet) {
                        elem.selectedIndex = -1;
                    }
                    return values;
                }
            }
        }
    });
    jQuery.each([
        'radio',
        'checkbox'
    ], function () {
        jQuery.valHooks[this] = {
            set: function (elem, value) {
                if (Array.isArray(value)) {
                    return elem.checked = jQuery.inArray(jQuery(elem).val(), value) > -1;
                }
            }
        };
        if (!support.checkOn) {
            jQuery.valHooks[this].get = function (elem) {
                return elem.getAttribute('value') === null ? 'on' : elem.value;
            };
        }
    });
    support.focusin = 'onfocusin' in window;
    var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/, stopPropagationCallback = function (e) {
            e.stopPropagation();
        };
    jQuery.extend(jQuery.event, {
        trigger: function (event, data, elem, onlyHandlers) {
            var i, cur, tmp, bubbleType, ontype, handle, special, lastElement, eventPath = [elem || document], type = hasOwn.call(event, 'type') ? event.type : event, namespaces = hasOwn.call(event, 'namespace') ? event.namespace.split('.') : [];
            cur = lastElement = tmp = elem = elem || document;
            if (elem.nodeType === 3 || elem.nodeType === 8) {
                return;
            }
            if (rfocusMorph.test(type + jQuery.event.triggered)) {
                return;
            }
            if (type.indexOf('.') > -1) {
                namespaces = type.split('.');
                type = namespaces.shift();
                namespaces.sort();
            }
            ontype = type.indexOf(':') < 0 && 'on' + type;
            event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === 'object' && event);
            event.isTrigger = onlyHandlers ? 2 : 3;
            event.namespace = namespaces.join('.');
            event.rnamespace = event.namespace ? new RegExp('(^|\\.)' + namespaces.join('\\.(?:.*\\.|)') + '(\\.|$)') : null;
            event.result = undefined;
            if (!event.target) {
                event.target = elem;
            }
            data = data == null ? [event] : jQuery.makeArray(data, [event]);
            special = jQuery.event.special[type] || {};
            if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
                return;
            }
            if (!onlyHandlers && !special.noBubble && !isWindow(elem)) {
                bubbleType = special.delegateType || type;
                if (!rfocusMorph.test(bubbleType + type)) {
                    cur = cur.parentNode;
                }
                for (; cur; cur = cur.parentNode) {
                    eventPath.push(cur);
                    tmp = cur;
                }
                if (tmp === (elem.ownerDocument || document)) {
                    eventPath.push(tmp.defaultView || tmp.parentWindow || window);
                }
            }
            i = 0;
            while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
                lastElement = cur;
                event.type = i > 1 ? bubbleType : special.bindType || type;
                handle = (dataPriv.get(cur, 'events') || {})[event.type] && dataPriv.get(cur, 'handle');
                if (handle) {
                    handle.apply(cur, data);
                }
                handle = ontype && cur[ontype];
                if (handle && handle.apply && acceptData(cur)) {
                    event.result = handle.apply(cur, data);
                    if (event.result === false) {
                        event.preventDefault();
                    }
                }
            }
            event.type = type;
            if (!onlyHandlers && !event.isDefaultPrevented()) {
                if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {
                    if (ontype && isFunction(elem[type]) && !isWindow(elem)) {
                        tmp = elem[ontype];
                        if (tmp) {
                            elem[ontype] = null;
                        }
                        jQuery.event.triggered = type;
                        if (event.isPropagationStopped()) {
                            lastElement.addEventListener(type, stopPropagationCallback);
                        }
                        elem[type]();
                        if (event.isPropagationStopped()) {
                            lastElement.removeEventListener(type, stopPropagationCallback);
                        }
                        jQuery.event.triggered = undefined;
                        if (tmp) {
                            elem[ontype] = tmp;
                        }
                    }
                }
            }
            return event.result;
        },
        simulate: function (type, elem, event) {
            var e = jQuery.extend(new jQuery.Event(), event, {
                type: type,
                isSimulated: true
            });
            jQuery.event.trigger(e, null, elem);
        }
    });
    jQuery.fn.extend({
        trigger: function (type, data) {
            return this.each(function () {
                jQuery.event.trigger(type, data, this);
            });
        },
        triggerHandler: function (type, data) {
            var elem = this[0];
            if (elem) {
                return jQuery.event.trigger(type, data, elem, true);
            }
        }
    });
    if (!support.focusin) {
        jQuery.each({
            focus: 'focusin',
            blur: 'focusout'
        }, function (orig, fix) {
            var handler = function (event) {
                jQuery.event.simulate(fix, event.target, jQuery.event.fix(event));
            };
            jQuery.event.special[fix] = {
                setup: function () {
                    var doc = this.ownerDocument || this, attaches = dataPriv.access(doc, fix);
                    if (!attaches) {
                        doc.addEventListener(orig, handler, true);
                    }
                    dataPriv.access(doc, fix, (attaches || 0) + 1);
                },
                teardown: function () {
                    var doc = this.ownerDocument || this, attaches = dataPriv.access(doc, fix) - 1;
                    if (!attaches) {
                        doc.removeEventListener(orig, handler, true);
                        dataPriv.remove(doc, fix);
                    } else {
                        dataPriv.access(doc, fix, attaches);
                    }
                }
            };
        });
    }
    var location = window.location;
    var nonce = Date.now();
    var rquery = /\?/;
    jQuery.parseXML = function (data) {
        var xml;
        if (!data || typeof data !== 'string') {
            return null;
        }
        try {
            xml = new window.DOMParser().parseFromString(data, 'text/xml');
        } catch (e) {
            xml = undefined;
        }
        if (!xml || xml.getElementsByTagName('parsererror').length) {
            jQuery.error('Invalid XML: ' + data);
        }
        return xml;
    };
    var rbracket = /\[\]$/, rCRLF = /\r?\n/g, rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i, rsubmittable = /^(?:input|select|textarea|keygen)/i;
    function buildParams(prefix, obj, traditional, add) {
        var name;
        if (Array.isArray(obj)) {
            jQuery.each(obj, function (i, v) {
                if (traditional || rbracket.test(prefix)) {
                    add(prefix, v);
                } else {
                    buildParams(prefix + '[' + (typeof v === 'object' && v != null ? i : '') + ']', v, traditional, add);
                }
            });
        } else if (!traditional && toType(obj) === 'object') {
            for (name in obj) {
                buildParams(prefix + '[' + name + ']', obj[name], traditional, add);
            }
        } else {
            add(prefix, obj);
        }
    }
    jQuery.param = function (a, traditional) {
        var prefix, s = [], add = function (key, valueOrFunction) {
                var value = isFunction(valueOrFunction) ? valueOrFunction() : valueOrFunction;
                s[s.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value == null ? '' : value);
            };
        if (Array.isArray(a) || a.jquery && !jQuery.isPlainObject(a)) {
            jQuery.each(a, function () {
                add(this.name, this.value);
            });
        } else {
            for (prefix in a) {
                buildParams(prefix, a[prefix], traditional, add);
            }
        }
        return s.join('&');
    };
    jQuery.fn.extend({
        serialize: function () {
            return jQuery.param(this.serializeArray());
        },
        serializeArray: function () {
            return this.map(function () {
                var elements = jQuery.prop(this, 'elements');
                return elements ? jQuery.makeArray(elements) : this;
            }).filter(function () {
                var type = this.type;
                return this.name && !jQuery(this).is(':disabled') && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
            }).map(function (i, elem) {
                var val = jQuery(this).val();
                if (val == null) {
                    return null;
                }
                if (Array.isArray(val)) {
                    return jQuery.map(val, function (val) {
                        return {
                            name: elem.name,
                            value: val.replace(rCRLF, '\r\n')
                        };
                    });
                }
                return {
                    name: elem.name,
                    value: val.replace(rCRLF, '\r\n')
                };
            }).get();
        }
    });
    var r20 = /%20/g, rhash = /#.*$/, rantiCache = /([?&])_=[^&]*/, rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg, rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/, rnoContent = /^(?:GET|HEAD)$/, rprotocol = /^\/\//, prefilters = {}, transports = {}, allTypes = '*/'.concat('*'), originAnchor = document.createElement('a');
    originAnchor.href = location.href;
    function addToPrefiltersOrTransports(structure) {
        return function (dataTypeExpression, func) {
            if (typeof dataTypeExpression !== 'string') {
                func = dataTypeExpression;
                dataTypeExpression = '*';
            }
            var dataType, i = 0, dataTypes = dataTypeExpression.toLowerCase().match(rnothtmlwhite) || [];
            if (isFunction(func)) {
                while (dataType = dataTypes[i++]) {
                    if (dataType[0] === '+') {
                        dataType = dataType.slice(1) || '*';
                        (structure[dataType] = structure[dataType] || []).unshift(func);
                    } else {
                        (structure[dataType] = structure[dataType] || []).push(func);
                    }
                }
            }
        };
    }
    function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
        var inspected = {}, seekingTransport = structure === transports;
        function inspect(dataType) {
            var selected;
            inspected[dataType] = true;
            jQuery.each(structure[dataType] || [], function (_, prefilterOrFactory) {
                var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
                if (typeof dataTypeOrTransport === 'string' && !seekingTransport && !inspected[dataTypeOrTransport]) {
                    options.dataTypes.unshift(dataTypeOrTransport);
                    inspect(dataTypeOrTransport);
                    return false;
                } else if (seekingTransport) {
                    return !(selected = dataTypeOrTransport);
                }
            });
            return selected;
        }
        return inspect(options.dataTypes[0]) || !inspected['*'] && inspect('*');
    }
    function ajaxExtend(target, src) {
        var key, deep, flatOptions = jQuery.ajaxSettings.flatOptions || {};
        for (key in src) {
            if (src[key] !== undefined) {
                (flatOptions[key] ? target : deep || (deep = {}))[key] = src[key];
            }
        }
        if (deep) {
            jQuery.extend(true, target, deep);
        }
        return target;
    }
    function ajaxHandleResponses(s, jqXHR, responses) {
        var ct, type, finalDataType, firstDataType, contents = s.contents, dataTypes = s.dataTypes;
        while (dataTypes[0] === '*') {
            dataTypes.shift();
            if (ct === undefined) {
                ct = s.mimeType || jqXHR.getResponseHeader('Content-Type');
            }
        }
        if (ct) {
            for (type in contents) {
                if (contents[type] && contents[type].test(ct)) {
                    dataTypes.unshift(type);
                    break;
                }
            }
        }
        if (dataTypes[0] in responses) {
            finalDataType = dataTypes[0];
        } else {
            for (type in responses) {
                if (!dataTypes[0] || s.converters[type + ' ' + dataTypes[0]]) {
                    finalDataType = type;
                    break;
                }
                if (!firstDataType) {
                    firstDataType = type;
                }
            }
            finalDataType = finalDataType || firstDataType;
        }
        if (finalDataType) {
            if (finalDataType !== dataTypes[0]) {
                dataTypes.unshift(finalDataType);
            }
            return responses[finalDataType];
        }
    }
    function ajaxConvert(s, response, jqXHR, isSuccess) {
        var conv2, current, conv, tmp, prev, converters = {}, dataTypes = s.dataTypes.slice();
        if (dataTypes[1]) {
            for (conv in s.converters) {
                converters[conv.toLowerCase()] = s.converters[conv];
            }
        }
        current = dataTypes.shift();
        while (current) {
            if (s.responseFields[current]) {
                jqXHR[s.responseFields[current]] = response;
            }
            if (!prev && isSuccess && s.dataFilter) {
                response = s.dataFilter(response, s.dataType);
            }
            prev = current;
            current = dataTypes.shift();
            if (current) {
                if (current === '*') {
                    current = prev;
                } else if (prev !== '*' && prev !== current) {
                    conv = converters[prev + ' ' + current] || converters['* ' + current];
                    if (!conv) {
                        for (conv2 in converters) {
                            tmp = conv2.split(' ');
                            if (tmp[1] === current) {
                                conv = converters[prev + ' ' + tmp[0]] || converters['* ' + tmp[0]];
                                if (conv) {
                                    if (conv === true) {
                                        conv = converters[conv2];
                                    } else if (converters[conv2] !== true) {
                                        current = tmp[0];
                                        dataTypes.unshift(tmp[1]);
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    if (conv !== true) {
                        if (conv && s.throws) {
                            response = conv(response);
                        } else {
                            try {
                                response = conv(response);
                            } catch (e) {
                                return {
                                    state: 'parsererror',
                                    error: conv ? e : 'No conversion from ' + prev + ' to ' + current
                                };
                            }
                        }
                    }
                }
            }
        }
        return {
            state: 'success',
            data: response
        };
    }
    jQuery.extend({
        active: 0,
        lastModified: {},
        etag: {},
        ajaxSettings: {
            url: location.href,
            type: 'GET',
            isLocal: rlocalProtocol.test(location.protocol),
            global: true,
            processData: true,
            async: true,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            accepts: {
                '*': allTypes,
                text: 'text/plain',
                html: 'text/html',
                xml: 'application/xml, text/xml',
                json: 'application/json, text/javascript'
            },
            contents: {
                xml: /\bxml\b/,
                html: /\bhtml/,
                json: /\bjson\b/
            },
            responseFields: {
                xml: 'responseXML',
                text: 'responseText',
                json: 'responseJSON'
            },
            converters: {
                '* text': String,
                'text html': true,
                'text json': JSON.parse,
                'text xml': jQuery.parseXML
            },
            flatOptions: {
                url: true,
                context: true
            }
        },
        ajaxSetup: function (target, settings) {
            return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
        },
        ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
        ajaxTransport: addToPrefiltersOrTransports(transports),
        ajax: function (url, options) {
            if (typeof url === 'object') {
                options = url;
                url = undefined;
            }
            options = options || {};
            var transport, cacheURL, responseHeadersString, responseHeaders, timeoutTimer, urlAnchor, completed, fireGlobals, i, uncached, s = jQuery.ajaxSetup({}, options), callbackContext = s.context || s, globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event, deferred = jQuery.Deferred(), completeDeferred = jQuery.Callbacks('once memory'), statusCode = s.statusCode || {}, requestHeaders = {}, requestHeadersNames = {}, strAbort = 'canceled', jqXHR = {
                    readyState: 0,
                    getResponseHeader: function (key) {
                        var match;
                        if (completed) {
                            if (!responseHeaders) {
                                responseHeaders = {};
                                while (match = rheaders.exec(responseHeadersString)) {
                                    responseHeaders[match[1].toLowerCase()] = match[2];
                                }
                            }
                            match = responseHeaders[key.toLowerCase()];
                        }
                        return match == null ? null : match;
                    },
                    getAllResponseHeaders: function () {
                        return completed ? responseHeadersString : null;
                    },
                    setRequestHeader: function (name, value) {
                        if (completed == null) {
                            name = requestHeadersNames[name.toLowerCase()] = requestHeadersNames[name.toLowerCase()] || name;
                            requestHeaders[name] = value;
                        }
                        return this;
                    },
                    overrideMimeType: function (type) {
                        if (completed == null) {
                            s.mimeType = type;
                        }
                        return this;
                    },
                    statusCode: function (map) {
                        var code;
                        if (map) {
                            if (completed) {
                                jqXHR.always(map[jqXHR.status]);
                            } else {
                                for (code in map) {
                                    statusCode[code] = [
                                        statusCode[code],
                                        map[code]
                                    ];
                                }
                            }
                        }
                        return this;
                    },
                    abort: function (statusText) {
                        var finalText = statusText || strAbort;
                        if (transport) {
                            transport.abort(finalText);
                        }
                        done(0, finalText);
                        return this;
                    }
                };
            deferred.promise(jqXHR);
            s.url = ((url || s.url || location.href) + '').replace(rprotocol, location.protocol + '//');
            s.type = options.method || options.type || s.method || s.type;
            s.dataTypes = (s.dataType || '*').toLowerCase().match(rnothtmlwhite) || [''];
            if (s.crossDomain == null) {
                urlAnchor = document.createElement('a');
                try {
                    urlAnchor.href = s.url;
                    urlAnchor.href = urlAnchor.href;
                    s.crossDomain = originAnchor.protocol + '//' + originAnchor.host !== urlAnchor.protocol + '//' + urlAnchor.host;
                } catch (e) {
                    s.crossDomain = true;
                }
            }
            if (s.data && s.processData && typeof s.data !== 'string') {
                s.data = jQuery.param(s.data, s.traditional);
            }
            inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
            if (completed) {
                return jqXHR;
            }
            fireGlobals = jQuery.event && s.global;
            if (fireGlobals && jQuery.active++ === 0) {
                jQuery.event.trigger('ajaxStart');
            }
            s.type = s.type.toUpperCase();
            s.hasContent = !rnoContent.test(s.type);
            cacheURL = s.url.replace(rhash, '');
            if (!s.hasContent) {
                uncached = s.url.slice(cacheURL.length);
                if (s.data && (s.processData || typeof s.data === 'string')) {
                    cacheURL += (rquery.test(cacheURL) ? '&' : '?') + s.data;
                    delete s.data;
                }
                if (s.cache === false) {
                    cacheURL = cacheURL.replace(rantiCache, '$1');
                    uncached = (rquery.test(cacheURL) ? '&' : '?') + '_=' + nonce++ + uncached;
                }
                s.url = cacheURL + uncached;
            } else if (s.data && s.processData && (s.contentType || '').indexOf('application/x-www-form-urlencoded') === 0) {
                s.data = s.data.replace(r20, '+');
            }
            if (s.ifModified) {
                if (jQuery.lastModified[cacheURL]) {
                    jqXHR.setRequestHeader('If-Modified-Since', jQuery.lastModified[cacheURL]);
                }
                if (jQuery.etag[cacheURL]) {
                    jqXHR.setRequestHeader('If-None-Match', jQuery.etag[cacheURL]);
                }
            }
            if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
                jqXHR.setRequestHeader('Content-Type', s.contentType);
            }
            jqXHR.setRequestHeader('Accept', s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== '*' ? ', ' + allTypes + '; q=0.01' : '') : s.accepts['*']);
            for (i in s.headers) {
                jqXHR.setRequestHeader(i, s.headers[i]);
            }
            if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || completed)) {
                return jqXHR.abort();
            }
            strAbort = 'abort';
            completeDeferred.add(s.complete);
            jqXHR.done(s.success);
            jqXHR.fail(s.error);
            transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
            if (!transport) {
                done(-1, 'No Transport');
            } else {
                jqXHR.readyState = 1;
                if (fireGlobals) {
                    globalEventContext.trigger('ajaxSend', [
                        jqXHR,
                        s
                    ]);
                }
                if (completed) {
                    return jqXHR;
                }
                if (s.async && s.timeout > 0) {
                    timeoutTimer = window.setTimeout(function () {
                        jqXHR.abort('timeout');
                    }, s.timeout);
                }
                try {
                    completed = false;
                    transport.send(requestHeaders, done);
                } catch (e) {
                    if (completed) {
                        throw e;
                    }
                    done(-1, e);
                }
            }
            function done(status, nativeStatusText, responses, headers) {
                var isSuccess, success, error, response, modified, statusText = nativeStatusText;
                if (completed) {
                    return;
                }
                completed = true;
                if (timeoutTimer) {
                    window.clearTimeout(timeoutTimer);
                }
                transport = undefined;
                responseHeadersString = headers || '';
                jqXHR.readyState = status > 0 ? 4 : 0;
                isSuccess = status >= 200 && status < 300 || status === 304;
                if (responses) {
                    response = ajaxHandleResponses(s, jqXHR, responses);
                }
                response = ajaxConvert(s, response, jqXHR, isSuccess);
                if (isSuccess) {
                    if (s.ifModified) {
                        modified = jqXHR.getResponseHeader('Last-Modified');
                        if (modified) {
                            jQuery.lastModified[cacheURL] = modified;
                        }
                        modified = jqXHR.getResponseHeader('etag');
                        if (modified) {
                            jQuery.etag[cacheURL] = modified;
                        }
                    }
                    if (status === 204 || s.type === 'HEAD') {
                        statusText = 'nocontent';
                    } else if (status === 304) {
                        statusText = 'notmodified';
                    } else {
                        statusText = response.state;
                        success = response.data;
                        error = response.error;
                        isSuccess = !error;
                    }
                } else {
                    error = statusText;
                    if (status || !statusText) {
                        statusText = 'error';
                        if (status < 0) {
                            status = 0;
                        }
                    }
                }
                jqXHR.status = status;
                jqXHR.statusText = (nativeStatusText || statusText) + '';
                if (isSuccess) {
                    deferred.resolveWith(callbackContext, [
                        success,
                        statusText,
                        jqXHR
                    ]);
                } else {
                    deferred.rejectWith(callbackContext, [
                        jqXHR,
                        statusText,
                        error
                    ]);
                }
                jqXHR.statusCode(statusCode);
                statusCode = undefined;
                if (fireGlobals) {
                    globalEventContext.trigger(isSuccess ? 'ajaxSuccess' : 'ajaxError', [
                        jqXHR,
                        s,
                        isSuccess ? success : error
                    ]);
                }
                completeDeferred.fireWith(callbackContext, [
                    jqXHR,
                    statusText
                ]);
                if (fireGlobals) {
                    globalEventContext.trigger('ajaxComplete', [
                        jqXHR,
                        s
                    ]);
                    if (!--jQuery.active) {
                        jQuery.event.trigger('ajaxStop');
                    }
                }
            }
            return jqXHR;
        },
        getJSON: function (url, data, callback) {
            return jQuery.get(url, data, callback, 'json');
        },
        getScript: function (url, callback) {
            return jQuery.get(url, undefined, callback, 'script');
        }
    });
    jQuery.each([
        'get',
        'post'
    ], function (i, method) {
        jQuery[method] = function (url, data, callback, type) {
            if (isFunction(data)) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            return jQuery.ajax(jQuery.extend({
                url: url,
                type: method,
                dataType: type,
                data: data,
                success: callback
            }, jQuery.isPlainObject(url) && url));
        };
    });
    jQuery._evalUrl = function (url) {
        return jQuery.ajax({
            url: url,
            type: 'GET',
            dataType: 'script',
            cache: true,
            async: false,
            global: false,
            'throws': true
        });
    };
    jQuery.fn.extend({
        wrapAll: function (html) {
            var wrap;
            if (this[0]) {
                if (isFunction(html)) {
                    html = html.call(this[0]);
                }
                wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
                if (this[0].parentNode) {
                    wrap.insertBefore(this[0]);
                }
                wrap.map(function () {
                    var elem = this;
                    while (elem.firstElementChild) {
                        elem = elem.firstElementChild;
                    }
                    return elem;
                }).append(this);
            }
            return this;
        },
        wrapInner: function (html) {
            if (isFunction(html)) {
                return this.each(function (i) {
                    jQuery(this).wrapInner(html.call(this, i));
                });
            }
            return this.each(function () {
                var self = jQuery(this), contents = self.contents();
                if (contents.length) {
                    contents.wrapAll(html);
                } else {
                    self.append(html);
                }
            });
        },
        wrap: function (html) {
            var htmlIsFunction = isFunction(html);
            return this.each(function (i) {
                jQuery(this).wrapAll(htmlIsFunction ? html.call(this, i) : html);
            });
        },
        unwrap: function (selector) {
            this.parent(selector).not('body').each(function () {
                jQuery(this).replaceWith(this.childNodes);
            });
            return this;
        }
    });
    jQuery.expr.pseudos.hidden = function (elem) {
        return !jQuery.expr.pseudos.visible(elem);
    };
    jQuery.expr.pseudos.visible = function (elem) {
        return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
    };
    jQuery.ajaxSettings.xhr = function () {
        try {
            return new window.XMLHttpRequest();
        } catch (e) {
        }
    };
    var xhrSuccessStatus = {
            0: 200,
            1223: 204
        }, xhrSupported = jQuery.ajaxSettings.xhr();
    support.cors = !!xhrSupported && 'withCredentials' in xhrSupported;
    support.ajax = xhrSupported = !!xhrSupported;
    jQuery.ajaxTransport(function (options) {
        var callback, errorCallback;
        if (support.cors || xhrSupported && !options.crossDomain) {
            return {
                send: function (headers, complete) {
                    var i, xhr = options.xhr();
                    xhr.open(options.type, options.url, options.async, options.username, options.password);
                    if (options.xhrFields) {
                        for (i in options.xhrFields) {
                            xhr[i] = options.xhrFields[i];
                        }
                    }
                    if (options.mimeType && xhr.overrideMimeType) {
                        xhr.overrideMimeType(options.mimeType);
                    }
                    if (!options.crossDomain && !headers['X-Requested-With']) {
                        headers['X-Requested-With'] = 'XMLHttpRequest';
                    }
                    for (i in headers) {
                        xhr.setRequestHeader(i, headers[i]);
                    }
                    callback = function (type) {
                        return function () {
                            if (callback) {
                                callback = errorCallback = xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = xhr.onreadystatechange = null;
                                if (type === 'abort') {
                                    xhr.abort();
                                } else if (type === 'error') {
                                    if (typeof xhr.status !== 'number') {
                                        complete(0, 'error');
                                    } else {
                                        complete(xhr.status, xhr.statusText);
                                    }
                                } else {
                                    complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText, (xhr.responseType || 'text') !== 'text' || typeof xhr.responseText !== 'string' ? { binary: xhr.response } : { text: xhr.responseText }, xhr.getAllResponseHeaders());
                                }
                            }
                        };
                    };
                    xhr.onload = callback();
                    errorCallback = xhr.onerror = xhr.ontimeout = callback('error');
                    if (xhr.onabort !== undefined) {
                        xhr.onabort = errorCallback;
                    } else {
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState === 4) {
                                window.setTimeout(function () {
                                    if (callback) {
                                        errorCallback();
                                    }
                                });
                            }
                        };
                    }
                    callback = callback('abort');
                    try {
                        xhr.send(options.hasContent && options.data || null);
                    } catch (e) {
                        if (callback) {
                            throw e;
                        }
                    }
                },
                abort: function () {
                    if (callback) {
                        callback();
                    }
                }
            };
        }
    });
    jQuery.ajaxPrefilter(function (s) {
        if (s.crossDomain) {
            s.contents.script = false;
        }
    });
    jQuery.ajaxSetup({
        accepts: { script: 'text/javascript, application/javascript, ' + 'application/ecmascript, application/x-ecmascript' },
        contents: { script: /\b(?:java|ecma)script\b/ },
        converters: {
            'text script': function (text) {
                jQuery.globalEval(text);
                return text;
            }
        }
    });
    jQuery.ajaxPrefilter('script', function (s) {
        if (s.cache === undefined) {
            s.cache = false;
        }
        if (s.crossDomain) {
            s.type = 'GET';
        }
    });
    jQuery.ajaxTransport('script', function (s) {
        if (s.crossDomain) {
            var script, callback;
            return {
                send: function (_, complete) {
                    script = jQuery('<script>').prop({
                        charset: s.scriptCharset,
                        src: s.url
                    }).on('load error', callback = function (evt) {
                        script.remove();
                        callback = null;
                        if (evt) {
                            complete(evt.type === 'error' ? 404 : 200, evt.type);
                        }
                    });
                    document.head.appendChild(script[0]);
                },
                abort: function () {
                    if (callback) {
                        callback();
                    }
                }
            };
        }
    });
    var oldCallbacks = [], rjsonp = /(=)\?(?=&|$)|\?\?/;
    jQuery.ajaxSetup({
        jsonp: 'callback',
        jsonpCallback: function () {
            var callback = oldCallbacks.pop() || jQuery.expando + '_' + nonce++;
            this[callback] = true;
            return callback;
        }
    });
    jQuery.ajaxPrefilter('json jsonp', function (s, originalSettings, jqXHR) {
        var callbackName, overwritten, responseContainer, jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? 'url' : typeof s.data === 'string' && (s.contentType || '').indexOf('application/x-www-form-urlencoded') === 0 && rjsonp.test(s.data) && 'data');
        if (jsonProp || s.dataTypes[0] === 'jsonp') {
            callbackName = s.jsonpCallback = isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
            if (jsonProp) {
                s[jsonProp] = s[jsonProp].replace(rjsonp, '$1' + callbackName);
            } else if (s.jsonp !== false) {
                s.url += (rquery.test(s.url) ? '&' : '?') + s.jsonp + '=' + callbackName;
            }
            s.converters['script json'] = function () {
                if (!responseContainer) {
                    jQuery.error(callbackName + ' was not called');
                }
                return responseContainer[0];
            };
            s.dataTypes[0] = 'json';
            overwritten = window[callbackName];
            window[callbackName] = function () {
                responseContainer = arguments;
            };
            jqXHR.always(function () {
                if (overwritten === undefined) {
                    jQuery(window).removeProp(callbackName);
                } else {
                    window[callbackName] = overwritten;
                }
                if (s[callbackName]) {
                    s.jsonpCallback = originalSettings.jsonpCallback;
                    oldCallbacks.push(callbackName);
                }
                if (responseContainer && isFunction(overwritten)) {
                    overwritten(responseContainer[0]);
                }
                responseContainer = overwritten = undefined;
            });
            return 'script';
        }
    });
    support.createHTMLDocument = function () {
        var body = document.implementation.createHTMLDocument('').body;
        body.innerHTML = '<form></form><form></form>';
        return body.childNodes.length === 2;
    }();
    jQuery.parseHTML = function (data, context, keepScripts) {
        if (typeof data !== 'string') {
            return [];
        }
        if (typeof context === 'boolean') {
            keepScripts = context;
            context = false;
        }
        var base, parsed, scripts;
        if (!context) {
            if (support.createHTMLDocument) {
                context = document.implementation.createHTMLDocument('');
                base = context.createElement('base');
                base.href = document.location.href;
                context.head.appendChild(base);
            } else {
                context = document;
            }
        }
        parsed = rsingleTag.exec(data);
        scripts = !keepScripts && [];
        if (parsed) {
            return [context.createElement(parsed[1])];
        }
        parsed = buildFragment([data], context, scripts);
        if (scripts && scripts.length) {
            jQuery(scripts).remove();
        }
        return jQuery.merge([], parsed.childNodes);
    };
    jQuery.fn.load = function (url, params, callback) {
        var selector, type, response, self = this, off = url.indexOf(' ');
        if (off > -1) {
            selector = stripAndCollapse(url.slice(off));
            url = url.slice(0, off);
        }
        if (isFunction(params)) {
            callback = params;
            params = undefined;
        } else if (params && typeof params === 'object') {
            type = 'POST';
        }
        if (self.length > 0) {
            jQuery.ajax({
                url: url,
                type: type || 'GET',
                dataType: 'html',
                data: params
            }).done(function (responseText) {
                response = arguments;
                self.html(selector ? jQuery('<div>').append(jQuery.parseHTML(responseText)).find(selector) : responseText);
            }).always(callback && function (jqXHR, status) {
                self.each(function () {
                    callback.apply(this, response || [
                        jqXHR.responseText,
                        status,
                        jqXHR
                    ]);
                });
            });
        }
        return this;
    };
    jQuery.each([
        'ajaxStart',
        'ajaxStop',
        'ajaxComplete',
        'ajaxError',
        'ajaxSuccess',
        'ajaxSend'
    ], function (i, type) {
        jQuery.fn[type] = function (fn) {
            return this.on(type, fn);
        };
    });
    jQuery.expr.pseudos.animated = function (elem) {
        return jQuery.grep(jQuery.timers, function (fn) {
            return elem === fn.elem;
        }).length;
    };
    jQuery.offset = {
        setOffset: function (elem, options, i) {
            var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition, position = jQuery.css(elem, 'position'), curElem = jQuery(elem), props = {};
            if (position === 'static') {
                elem.style.position = 'relative';
            }
            curOffset = curElem.offset();
            curCSSTop = jQuery.css(elem, 'top');
            curCSSLeft = jQuery.css(elem, 'left');
            calculatePosition = (position === 'absolute' || position === 'fixed') && (curCSSTop + curCSSLeft).indexOf('auto') > -1;
            if (calculatePosition) {
                curPosition = curElem.position();
                curTop = curPosition.top;
                curLeft = curPosition.left;
            } else {
                curTop = parseFloat(curCSSTop) || 0;
                curLeft = parseFloat(curCSSLeft) || 0;
            }
            if (isFunction(options)) {
                options = options.call(elem, i, jQuery.extend({}, curOffset));
            }
            if (options.top != null) {
                props.top = options.top - curOffset.top + curTop;
            }
            if (options.left != null) {
                props.left = options.left - curOffset.left + curLeft;
            }
            if ('using' in options) {
                options.using.call(elem, props);
            } else {
                curElem.css(props);
            }
        }
    };
    jQuery.fn.extend({
        offset: function (options) {
            if (arguments.length) {
                return options === undefined ? this : this.each(function (i) {
                    jQuery.offset.setOffset(this, options, i);
                });
            }
            var rect, win, elem = this[0];
            if (!elem) {
                return;
            }
            if (!elem.getClientRects().length) {
                return {
                    top: 0,
                    left: 0
                };
            }
            rect = elem.getBoundingClientRect();
            win = elem.ownerDocument.defaultView;
            return {
                top: rect.top + win.pageYOffset,
                left: rect.left + win.pageXOffset
            };
        },
        position: function () {
            if (!this[0]) {
                return;
            }
            var offsetParent, offset, doc, elem = this[0], parentOffset = {
                    top: 0,
                    left: 0
                };
            if (jQuery.css(elem, 'position') === 'fixed') {
                offset = elem.getBoundingClientRect();
            } else {
                offset = this.offset();
                doc = elem.ownerDocument;
                offsetParent = elem.offsetParent || doc.documentElement;
                while (offsetParent && (offsetParent === doc.body || offsetParent === doc.documentElement) && jQuery.css(offsetParent, 'position') === 'static') {
                    offsetParent = offsetParent.parentNode;
                }
                if (offsetParent && offsetParent !== elem && offsetParent.nodeType === 1) {
                    parentOffset = jQuery(offsetParent).offset();
                    parentOffset.top += jQuery.css(offsetParent, 'borderTopWidth', true);
                    parentOffset.left += jQuery.css(offsetParent, 'borderLeftWidth', true);
                }
            }
            return {
                top: offset.top - parentOffset.top - jQuery.css(elem, 'marginTop', true),
                left: offset.left - parentOffset.left - jQuery.css(elem, 'marginLeft', true)
            };
        },
        offsetParent: function () {
            return this.map(function () {
                var offsetParent = this.offsetParent;
                while (offsetParent && jQuery.css(offsetParent, 'position') === 'static') {
                    offsetParent = offsetParent.offsetParent;
                }
                return offsetParent || documentElement;
            });
        }
    });
    jQuery.each({
        scrollLeft: 'pageXOffset',
        scrollTop: 'pageYOffset'
    }, function (method, prop) {
        var top = 'pageYOffset' === prop;
        jQuery.fn[method] = function (val) {
            return access(this, function (elem, method, val) {
                var win;
                if (isWindow(elem)) {
                    win = elem;
                } else if (elem.nodeType === 9) {
                    win = elem.defaultView;
                }
                if (val === undefined) {
                    return win ? win[prop] : elem[method];
                }
                if (win) {
                    win.scrollTo(!top ? val : win.pageXOffset, top ? val : win.pageYOffset);
                } else {
                    elem[method] = val;
                }
            }, method, val, arguments.length);
        };
    });
    jQuery.each([
        'top',
        'left'
    ], function (i, prop) {
        jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function (elem, computed) {
            if (computed) {
                computed = curCSS(elem, prop);
                return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + 'px' : computed;
            }
        });
    });
    jQuery.each({
        Height: 'height',
        Width: 'width'
    }, function (name, type) {
        jQuery.each({
            padding: 'inner' + name,
            content: type,
            '': 'outer' + name
        }, function (defaultExtra, funcName) {
            jQuery.fn[funcName] = function (margin, value) {
                var chainable = arguments.length && (defaultExtra || typeof margin !== 'boolean'), extra = defaultExtra || (margin === true || value === true ? 'margin' : 'border');
                return access(this, function (elem, type, value) {
                    var doc;
                    if (isWindow(elem)) {
                        return funcName.indexOf('outer') === 0 ? elem['inner' + name] : elem.document.documentElement['client' + name];
                    }
                    if (elem.nodeType === 9) {
                        doc = elem.documentElement;
                        return Math.max(elem.body['scroll' + name], doc['scroll' + name], elem.body['offset' + name], doc['offset' + name], doc['client' + name]);
                    }
                    return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
                }, type, chainable ? margin : undefined, chainable);
            };
        });
    });
    jQuery.each(('blur focus focusin focusout resize scroll click dblclick ' + 'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' + 'change select submit keydown keypress keyup contextmenu').split(' '), function (i, name) {
        jQuery.fn[name] = function (data, fn) {
            return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
        };
    });
    jQuery.fn.extend({
        hover: function (fnOver, fnOut) {
            return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
        }
    });
    jQuery.fn.extend({
        bind: function (types, data, fn) {
            return this.on(types, null, data, fn);
        },
        unbind: function (types, fn) {
            return this.off(types, null, fn);
        },
        delegate: function (selector, types, data, fn) {
            return this.on(types, selector, data, fn);
        },
        undelegate: function (selector, types, fn) {
            return arguments.length === 1 ? this.off(selector, '**') : this.off(types, selector || '**', fn);
        }
    });
    jQuery.proxy = function (fn, context) {
        var tmp, args, proxy;
        if (typeof context === 'string') {
            tmp = fn[context];
            context = fn;
            fn = tmp;
        }
        if (!isFunction(fn)) {
            return undefined;
        }
        args = slice.call(arguments, 2);
        proxy = function () {
            return fn.apply(context || this, args.concat(slice.call(arguments)));
        };
        proxy.guid = fn.guid = fn.guid || jQuery.guid++;
        return proxy;
    };
    jQuery.holdReady = function (hold) {
        if (hold) {
            jQuery.readyWait++;
        } else {
            jQuery.ready(true);
        }
    };
    jQuery.isArray = Array.isArray;
    jQuery.parseJSON = JSON.parse;
    jQuery.nodeName = nodeName;
    jQuery.isFunction = isFunction;
    jQuery.isWindow = isWindow;
    jQuery.camelCase = camelCase;
    jQuery.type = toType;
    jQuery.now = Date.now;
    jQuery.isNumeric = function (obj) {
        var type = jQuery.type(obj);
        return (type === 'number' || type === 'string') && !isNaN(obj - parseFloat(obj));
    };
    if (typeof define === 'function' && define.amd) {
        define('jquery@3.3.1#dist/jquery', [], function () {
            return jQuery;
        });
    }
    var _jQuery = window.jQuery, _$ = window.$;
    jQuery.noConflict = function (deep) {
        if (window.$ === jQuery) {
            window.$ = _$;
        }
        if (deep && window.jQuery === jQuery) {
            window.jQuery = _jQuery;
        }
        return jQuery;
    };
    if (!noGlobal) {
        window.jQuery = window.$ = jQuery;
    }
    return jQuery;
}));
/*underscore@1.9.1#underscore*/
(function () {
    var root = typeof self == 'object' && self.self === self && self || typeof global == 'object' && global.global === global && global || this || {};
    var previousUnderscore = root._;
    var ArrayProto = Array.prototype, ObjProto = Object.prototype;
    var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;
    var push = ArrayProto.push, slice = ArrayProto.slice, toString = ObjProto.toString, hasOwnProperty = ObjProto.hasOwnProperty;
    var nativeIsArray = Array.isArray, nativeKeys = Object.keys, nativeCreate = Object.create;
    var Ctor = function () {
    };
    var _ = function (obj) {
        if (obj instanceof _)
            return obj;
        if (!(this instanceof _))
            return new _(obj);
        this._wrapped = obj;
    };
    if (typeof exports != 'undefined' && !exports.nodeType) {
        if (typeof module != 'undefined' && !module.nodeType && module.exports) {
            exports = module.exports = _;
        }
        exports._ = _;
    } else {
        root._ = _;
    }
    _.VERSION = '1.9.1';
    var optimizeCb = function (func, context, argCount) {
        if (context === void 0)
            return func;
        switch (argCount == null ? 3 : argCount) {
        case 1:
            return function (value) {
                return func.call(context, value);
            };
        case 3:
            return function (value, index, collection) {
                return func.call(context, value, index, collection);
            };
        case 4:
            return function (accumulator, value, index, collection) {
                return func.call(context, accumulator, value, index, collection);
            };
        }
        return function () {
            return func.apply(context, arguments);
        };
    };
    var builtinIteratee;
    var cb = function (value, context, argCount) {
        if (_.iteratee !== builtinIteratee)
            return _.iteratee(value, context);
        if (value == null)
            return _.identity;
        if (_.isFunction(value))
            return optimizeCb(value, context, argCount);
        if (_.isObject(value) && !_.isArray(value))
            return _.matcher(value);
        return _.property(value);
    };
    _.iteratee = builtinIteratee = function (value, context) {
        return cb(value, context, Infinity);
    };
    var restArguments = function (func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function () {
            var length = Math.max(arguments.length - startIndex, 0), rest = Array(length), index = 0;
            for (; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
            case 0:
                return func.call(this, rest);
            case 1:
                return func.call(this, arguments[0], rest);
            case 2:
                return func.call(this, arguments[0], arguments[1], rest);
            }
            var args = Array(startIndex + 1);
            for (index = 0; index < startIndex; index++) {
                args[index] = arguments[index];
            }
            args[startIndex] = rest;
            return func.apply(this, args);
        };
    };
    var baseCreate = function (prototype) {
        if (!_.isObject(prototype))
            return {};
        if (nativeCreate)
            return nativeCreate(prototype);
        Ctor.prototype = prototype;
        var result = new Ctor();
        Ctor.prototype = null;
        return result;
    };
    var shallowProperty = function (key) {
        return function (obj) {
            return obj == null ? void 0 : obj[key];
        };
    };
    var has = function (obj, path) {
        return obj != null && hasOwnProperty.call(obj, path);
    };
    var deepGet = function (obj, path) {
        var length = path.length;
        for (var i = 0; i < length; i++) {
            if (obj == null)
                return void 0;
            obj = obj[path[i]];
        }
        return length ? obj : void 0;
    };
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
    var getLength = shallowProperty('length');
    var isArrayLike = function (collection) {
        var length = getLength(collection);
        return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };
    _.each = _.forEach = function (obj, iteratee, context) {
        iteratee = optimizeCb(iteratee, context);
        var i, length;
        if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
                iteratee(obj[i], i, obj);
            }
        } else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
                iteratee(obj[keys[i]], keys[i], obj);
            }
        }
        return obj;
    };
    _.map = _.collect = function (obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, results = Array(length);
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };
    var createReduce = function (dir) {
        var reducer = function (obj, iteratee, memo, initial) {
            var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length, index = dir > 0 ? 0 : length - 1;
            if (!initial) {
                memo = obj[keys ? keys[index] : index];
                index += dir;
            }
            for (; index >= 0 && index < length; index += dir) {
                var currentKey = keys ? keys[index] : index;
                memo = iteratee(memo, obj[currentKey], currentKey, obj);
            }
            return memo;
        };
        return function (obj, iteratee, memo, context) {
            var initial = arguments.length >= 3;
            return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
        };
    };
    _.reduce = _.foldl = _.inject = createReduce(1);
    _.reduceRight = _.foldr = createReduce(-1);
    _.find = _.detect = function (obj, predicate, context) {
        var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
        var key = keyFinder(obj, predicate, context);
        if (key !== void 0 && key !== -1)
            return obj[key];
    };
    _.filter = _.select = function (obj, predicate, context) {
        var results = [];
        predicate = cb(predicate, context);
        _.each(obj, function (value, index, list) {
            if (predicate(value, index, list))
                results.push(value);
        });
        return results;
    };
    _.reject = function (obj, predicate, context) {
        return _.filter(obj, _.negate(cb(predicate)), context);
    };
    _.every = _.all = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (!predicate(obj[currentKey], currentKey, obj))
                return false;
        }
        return true;
    };
    _.some = _.any = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = !isArrayLike(obj) && _.keys(obj), length = (keys || obj).length;
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (predicate(obj[currentKey], currentKey, obj))
                return true;
        }
        return false;
    };
    _.contains = _.includes = _.include = function (obj, item, fromIndex, guard) {
        if (!isArrayLike(obj))
            obj = _.values(obj);
        if (typeof fromIndex != 'number' || guard)
            fromIndex = 0;
        return _.indexOf(obj, item, fromIndex) >= 0;
    };
    _.invoke = restArguments(function (obj, path, args) {
        var contextPath, func;
        if (_.isFunction(path)) {
            func = path;
        } else if (_.isArray(path)) {
            contextPath = path.slice(0, -1);
            path = path[path.length - 1];
        }
        return _.map(obj, function (context) {
            var method = func;
            if (!method) {
                if (contextPath && contextPath.length) {
                    context = deepGet(context, contextPath);
                }
                if (context == null)
                    return void 0;
                method = context[path];
            }
            return method == null ? method : method.apply(context, args);
        });
    });
    _.pluck = function (obj, key) {
        return _.map(obj, _.property(key));
    };
    _.where = function (obj, attrs) {
        return _.filter(obj, _.matcher(attrs));
    };
    _.findWhere = function (obj, attrs) {
        return _.find(obj, _.matcher(attrs));
    };
    _.max = function (obj, iteratee, context) {
        var result = -Infinity, lastComputed = -Infinity, value, computed;
        if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
                value = obj[i];
                if (value != null && value > result) {
                    result = value;
                }
            }
        } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (v, index, list) {
                computed = iteratee(v, index, list);
                if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                    result = v;
                    lastComputed = computed;
                }
            });
        }
        return result;
    };
    _.min = function (obj, iteratee, context) {
        var result = Infinity, lastComputed = Infinity, value, computed;
        if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for (var i = 0, length = obj.length; i < length; i++) {
                value = obj[i];
                if (value != null && value < result) {
                    result = value;
                }
            }
        } else {
            iteratee = cb(iteratee, context);
            _.each(obj, function (v, index, list) {
                computed = iteratee(v, index, list);
                if (computed < lastComputed || computed === Infinity && result === Infinity) {
                    result = v;
                    lastComputed = computed;
                }
            });
        }
        return result;
    };
    _.shuffle = function (obj) {
        return _.sample(obj, Infinity);
    };
    _.sample = function (obj, n, guard) {
        if (n == null || guard) {
            if (!isArrayLike(obj))
                obj = _.values(obj);
            return obj[_.random(obj.length - 1)];
        }
        var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
        var length = getLength(sample);
        n = Math.max(Math.min(n, length), 0);
        var last = length - 1;
        for (var index = 0; index < n; index++) {
            var rand = _.random(index, last);
            var temp = sample[index];
            sample[index] = sample[rand];
            sample[rand] = temp;
        }
        return sample.slice(0, n);
    };
    _.sortBy = function (obj, iteratee, context) {
        var index = 0;
        iteratee = cb(iteratee, context);
        return _.pluck(_.map(obj, function (value, key, list) {
            return {
                value: value,
                index: index++,
                criteria: iteratee(value, key, list)
            };
        }).sort(function (left, right) {
            var a = left.criteria;
            var b = right.criteria;
            if (a !== b) {
                if (a > b || a === void 0)
                    return 1;
                if (a < b || b === void 0)
                    return -1;
            }
            return left.index - right.index;
        }), 'value');
    };
    var group = function (behavior, partition) {
        return function (obj, iteratee, context) {
            var result = partition ? [
                [],
                []
            ] : {};
            iteratee = cb(iteratee, context);
            _.each(obj, function (value, index) {
                var key = iteratee(value, index, obj);
                behavior(result, value, key);
            });
            return result;
        };
    };
    _.groupBy = group(function (result, value, key) {
        if (has(result, key))
            result[key].push(value);
        else
            result[key] = [value];
    });
    _.indexBy = group(function (result, value, key) {
        result[key] = value;
    });
    _.countBy = group(function (result, value, key) {
        if (has(result, key))
            result[key]++;
        else
            result[key] = 1;
    });
    var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
    _.toArray = function (obj) {
        if (!obj)
            return [];
        if (_.isArray(obj))
            return slice.call(obj);
        if (_.isString(obj)) {
            return obj.match(reStrSymbol);
        }
        if (isArrayLike(obj))
            return _.map(obj, _.identity);
        return _.values(obj);
    };
    _.size = function (obj) {
        if (obj == null)
            return 0;
        return isArrayLike(obj) ? obj.length : _.keys(obj).length;
    };
    _.partition = group(function (result, value, pass) {
        result[pass ? 0 : 1].push(value);
    }, true);
    _.first = _.head = _.take = function (array, n, guard) {
        if (array == null || array.length < 1)
            return n == null ? void 0 : [];
        if (n == null || guard)
            return array[0];
        return _.initial(array, array.length - n);
    };
    _.initial = function (array, n, guard) {
        return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
    };
    _.last = function (array, n, guard) {
        if (array == null || array.length < 1)
            return n == null ? void 0 : [];
        if (n == null || guard)
            return array[array.length - 1];
        return _.rest(array, Math.max(0, array.length - n));
    };
    _.rest = _.tail = _.drop = function (array, n, guard) {
        return slice.call(array, n == null || guard ? 1 : n);
    };
    _.compact = function (array) {
        return _.filter(array, Boolean);
    };
    var flatten = function (input, shallow, strict, output) {
        output = output || [];
        var idx = output.length;
        for (var i = 0, length = getLength(input); i < length; i++) {
            var value = input[i];
            if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
                if (shallow) {
                    var j = 0, len = value.length;
                    while (j < len)
                        output[idx++] = value[j++];
                } else {
                    flatten(value, shallow, strict, output);
                    idx = output.length;
                }
            } else if (!strict) {
                output[idx++] = value;
            }
        }
        return output;
    };
    _.flatten = function (array, shallow) {
        return flatten(array, shallow, false);
    };
    _.without = restArguments(function (array, otherArrays) {
        return _.difference(array, otherArrays);
    });
    _.uniq = _.unique = function (array, isSorted, iteratee, context) {
        if (!_.isBoolean(isSorted)) {
            context = iteratee;
            iteratee = isSorted;
            isSorted = false;
        }
        if (iteratee != null)
            iteratee = cb(iteratee, context);
        var result = [];
        var seen = [];
        for (var i = 0, length = getLength(array); i < length; i++) {
            var value = array[i], computed = iteratee ? iteratee(value, i, array) : value;
            if (isSorted && !iteratee) {
                if (!i || seen !== computed)
                    result.push(value);
                seen = computed;
            } else if (iteratee) {
                if (!_.contains(seen, computed)) {
                    seen.push(computed);
                    result.push(value);
                }
            } else if (!_.contains(result, value)) {
                result.push(value);
            }
        }
        return result;
    };
    _.union = restArguments(function (arrays) {
        return _.uniq(flatten(arrays, true, true));
    });
    _.intersection = function (array) {
        var result = [];
        var argsLength = arguments.length;
        for (var i = 0, length = getLength(array); i < length; i++) {
            var item = array[i];
            if (_.contains(result, item))
                continue;
            var j;
            for (j = 1; j < argsLength; j++) {
                if (!_.contains(arguments[j], item))
                    break;
            }
            if (j === argsLength)
                result.push(item);
        }
        return result;
    };
    _.difference = restArguments(function (array, rest) {
        rest = flatten(rest, true, true);
        return _.filter(array, function (value) {
            return !_.contains(rest, value);
        });
    });
    _.unzip = function (array) {
        var length = array && _.max(array, getLength).length || 0;
        var result = Array(length);
        for (var index = 0; index < length; index++) {
            result[index] = _.pluck(array, index);
        }
        return result;
    };
    _.zip = restArguments(_.unzip);
    _.object = function (list, values) {
        var result = {};
        for (var i = 0, length = getLength(list); i < length; i++) {
            if (values) {
                result[list[i]] = values[i];
            } else {
                result[list[i][0]] = list[i][1];
            }
        }
        return result;
    };
    var createPredicateIndexFinder = function (dir) {
        return function (array, predicate, context) {
            predicate = cb(predicate, context);
            var length = getLength(array);
            var index = dir > 0 ? 0 : length - 1;
            for (; index >= 0 && index < length; index += dir) {
                if (predicate(array[index], index, array))
                    return index;
            }
            return -1;
        };
    };
    _.findIndex = createPredicateIndexFinder(1);
    _.findLastIndex = createPredicateIndexFinder(-1);
    _.sortedIndex = function (array, obj, iteratee, context) {
        iteratee = cb(iteratee, context, 1);
        var value = iteratee(obj);
        var low = 0, high = getLength(array);
        while (low < high) {
            var mid = Math.floor((low + high) / 2);
            if (iteratee(array[mid]) < value)
                low = mid + 1;
            else
                high = mid;
        }
        return low;
    };
    var createIndexFinder = function (dir, predicateFind, sortedIndex) {
        return function (array, item, idx) {
            var i = 0, length = getLength(array);
            if (typeof idx == 'number') {
                if (dir > 0) {
                    i = idx >= 0 ? idx : Math.max(idx + length, i);
                } else {
                    length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
                }
            } else if (sortedIndex && idx && length) {
                idx = sortedIndex(array, item);
                return array[idx] === item ? idx : -1;
            }
            if (item !== item) {
                idx = predicateFind(slice.call(array, i, length), _.isNaN);
                return idx >= 0 ? idx + i : -1;
            }
            for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
                if (array[idx] === item)
                    return idx;
            }
            return -1;
        };
    };
    _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
    _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
    _.range = function (start, stop, step) {
        if (stop == null) {
            stop = start || 0;
            start = 0;
        }
        if (!step) {
            step = stop < start ? -1 : 1;
        }
        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = Array(length);
        for (var idx = 0; idx < length; idx++, start += step) {
            range[idx] = start;
        }
        return range;
    };
    _.chunk = function (array, count) {
        if (count == null || count < 1)
            return [];
        var result = [];
        var i = 0, length = array.length;
        while (i < length) {
            result.push(slice.call(array, i, i += count));
        }
        return result;
    };
    var executeBound = function (sourceFunc, boundFunc, context, callingContext, args) {
        if (!(callingContext instanceof boundFunc))
            return sourceFunc.apply(context, args);
        var self = baseCreate(sourceFunc.prototype);
        var result = sourceFunc.apply(self, args);
        if (_.isObject(result))
            return result;
        return self;
    };
    _.bind = restArguments(function (func, context, args) {
        if (!_.isFunction(func))
            throw new TypeError('Bind must be called on a function');
        var bound = restArguments(function (callArgs) {
            return executeBound(func, bound, context, this, args.concat(callArgs));
        });
        return bound;
    });
    _.partial = restArguments(function (func, boundArgs) {
        var placeholder = _.partial.placeholder;
        var bound = function () {
            var position = 0, length = boundArgs.length;
            var args = Array(length);
            for (var i = 0; i < length; i++) {
                args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
            }
            while (position < arguments.length)
                args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args);
        };
        return bound;
    });
    _.partial.placeholder = _;
    _.bindAll = restArguments(function (obj, keys) {
        keys = flatten(keys, false, false);
        var index = keys.length;
        if (index < 1)
            throw new Error('bindAll must be passed function names');
        while (index--) {
            var key = keys[index];
            obj[key] = _.bind(obj[key], obj);
        }
    });
    _.memoize = function (func, hasher) {
        var memoize = function (key) {
            var cache = memoize.cache;
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            if (!has(cache, address))
                cache[address] = func.apply(this, arguments);
            return cache[address];
        };
        memoize.cache = {};
        return memoize;
    };
    _.delay = restArguments(function (func, wait, args) {
        return setTimeout(function () {
            return func.apply(null, args);
        }, wait);
    });
    _.defer = _.partial(_.delay, _, 1);
    _.throttle = function (func, wait, options) {
        var timeout, context, args, result;
        var previous = 0;
        if (!options)
            options = {};
        var later = function () {
            previous = options.leading === false ? 0 : _.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout)
                context = args = null;
        };
        var throttled = function () {
            var now = _.now();
            if (!previous && options.leading === false)
                previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
        throttled.cancel = function () {
            clearTimeout(timeout);
            previous = 0;
            timeout = context = args = null;
        };
        return throttled;
    };
    _.debounce = function (func, wait, immediate) {
        var timeout, result;
        var later = function (context, args) {
            timeout = null;
            if (args)
                result = func.apply(context, args);
        };
        var debounced = restArguments(function (args) {
            if (timeout)
                clearTimeout(timeout);
            if (immediate) {
                var callNow = !timeout;
                timeout = setTimeout(later, wait);
                if (callNow)
                    result = func.apply(this, args);
            } else {
                timeout = _.delay(later, wait, this, args);
            }
            return result;
        });
        debounced.cancel = function () {
            clearTimeout(timeout);
            timeout = null;
        };
        return debounced;
    };
    _.wrap = function (func, wrapper) {
        return _.partial(wrapper, func);
    };
    _.negate = function (predicate) {
        return function () {
            return !predicate.apply(this, arguments);
        };
    };
    _.compose = function () {
        var args = arguments;
        var start = args.length - 1;
        return function () {
            var i = start;
            var result = args[start].apply(this, arguments);
            while (i--)
                result = args[i].call(this, result);
            return result;
        };
    };
    _.after = function (times, func) {
        return function () {
            if (--times < 1) {
                return func.apply(this, arguments);
            }
        };
    };
    _.before = function (times, func) {
        var memo;
        return function () {
            if (--times > 0) {
                memo = func.apply(this, arguments);
            }
            if (times <= 1)
                func = null;
            return memo;
        };
    };
    _.once = _.partial(_.before, 2);
    _.restArguments = restArguments;
    var hasEnumBug = !{ toString: null }.propertyIsEnumerable('toString');
    var nonEnumerableProps = [
        'valueOf',
        'isPrototypeOf',
        'toString',
        'propertyIsEnumerable',
        'hasOwnProperty',
        'toLocaleString'
    ];
    var collectNonEnumProps = function (obj, keys) {
        var nonEnumIdx = nonEnumerableProps.length;
        var constructor = obj.constructor;
        var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;
        var prop = 'constructor';
        if (has(obj, prop) && !_.contains(keys, prop))
            keys.push(prop);
        while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
                keys.push(prop);
            }
        }
    };
    _.keys = function (obj) {
        if (!_.isObject(obj))
            return [];
        if (nativeKeys)
            return nativeKeys(obj);
        var keys = [];
        for (var key in obj)
            if (has(obj, key))
                keys.push(key);
        if (hasEnumBug)
            collectNonEnumProps(obj, keys);
        return keys;
    };
    _.allKeys = function (obj) {
        if (!_.isObject(obj))
            return [];
        var keys = [];
        for (var key in obj)
            keys.push(key);
        if (hasEnumBug)
            collectNonEnumProps(obj, keys);
        return keys;
    };
    _.values = function (obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for (var i = 0; i < length; i++) {
            values[i] = obj[keys[i]];
        }
        return values;
    };
    _.mapObject = function (obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = _.keys(obj), length = keys.length, results = {};
        for (var index = 0; index < length; index++) {
            var currentKey = keys[index];
            results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };
    _.pairs = function (obj) {
        var keys = _.keys(obj);
        var length = keys.length;
        var pairs = Array(length);
        for (var i = 0; i < length; i++) {
            pairs[i] = [
                keys[i],
                obj[keys[i]]
            ];
        }
        return pairs;
    };
    _.invert = function (obj) {
        var result = {};
        var keys = _.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
            result[obj[keys[i]]] = keys[i];
        }
        return result;
    };
    _.functions = _.methods = function (obj) {
        var names = [];
        for (var key in obj) {
            if (_.isFunction(obj[key]))
                names.push(key);
        }
        return names.sort();
    };
    var createAssigner = function (keysFunc, defaults) {
        return function (obj) {
            var length = arguments.length;
            if (defaults)
                obj = Object(obj);
            if (length < 2 || obj == null)
                return obj;
            for (var index = 1; index < length; index++) {
                var source = arguments[index], keys = keysFunc(source), l = keys.length;
                for (var i = 0; i < l; i++) {
                    var key = keys[i];
                    if (!defaults || obj[key] === void 0)
                        obj[key] = source[key];
                }
            }
            return obj;
        };
    };
    _.extend = createAssigner(_.allKeys);
    _.extendOwn = _.assign = createAssigner(_.keys);
    _.findKey = function (obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = _.keys(obj), key;
        for (var i = 0, length = keys.length; i < length; i++) {
            key = keys[i];
            if (predicate(obj[key], key, obj))
                return key;
        }
    };
    var keyInObj = function (value, key, obj) {
        return key in obj;
    };
    _.pick = restArguments(function (obj, keys) {
        var result = {}, iteratee = keys[0];
        if (obj == null)
            return result;
        if (_.isFunction(iteratee)) {
            if (keys.length > 1)
                iteratee = optimizeCb(iteratee, keys[1]);
            keys = _.allKeys(obj);
        } else {
            iteratee = keyInObj;
            keys = flatten(keys, false, false);
            obj = Object(obj);
        }
        for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i];
            var value = obj[key];
            if (iteratee(value, key, obj))
                result[key] = value;
        }
        return result;
    });
    _.omit = restArguments(function (obj, keys) {
        var iteratee = keys[0], context;
        if (_.isFunction(iteratee)) {
            iteratee = _.negate(iteratee);
            if (keys.length > 1)
                context = keys[1];
        } else {
            keys = _.map(flatten(keys, false, false), String);
            iteratee = function (value, key) {
                return !_.contains(keys, key);
            };
        }
        return _.pick(obj, iteratee, context);
    });
    _.defaults = createAssigner(_.allKeys, true);
    _.create = function (prototype, props) {
        var result = baseCreate(prototype);
        if (props)
            _.extendOwn(result, props);
        return result;
    };
    _.clone = function (obj) {
        if (!_.isObject(obj))
            return obj;
        return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };
    _.tap = function (obj, interceptor) {
        interceptor(obj);
        return obj;
    };
    _.isMatch = function (object, attrs) {
        var keys = _.keys(attrs), length = keys.length;
        if (object == null)
            return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
            var key = keys[i];
            if (attrs[key] !== obj[key] || !(key in obj))
                return false;
        }
        return true;
    };
    var eq, deepEq;
    eq = function (a, b, aStack, bStack) {
        if (a === b)
            return a !== 0 || 1 / a === 1 / b;
        if (a == null || b == null)
            return false;
        if (a !== a)
            return b !== b;
        var type = typeof a;
        if (type !== 'function' && type !== 'object' && typeof b != 'object')
            return false;
        return deepEq(a, b, aStack, bStack);
    };
    deepEq = function (a, b, aStack, bStack) {
        if (a instanceof _)
            a = a._wrapped;
        if (b instanceof _)
            b = b._wrapped;
        var className = toString.call(a);
        if (className !== toString.call(b))
            return false;
        switch (className) {
        case '[object RegExp]':
        case '[object String]':
            return '' + a === '' + b;
        case '[object Number]':
            if (+a !== +a)
                return +b !== +b;
            return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case '[object Date]':
        case '[object Boolean]':
            return +a === +b;
        case '[object Symbol]':
            return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
        }
        var areArrays = className === '[object Array]';
        if (!areArrays) {
            if (typeof a != 'object' || typeof b != 'object')
                return false;
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor) && ('constructor' in a && 'constructor' in b)) {
                return false;
            }
        }
        aStack = aStack || [];
        bStack = bStack || [];
        var length = aStack.length;
        while (length--) {
            if (aStack[length] === a)
                return bStack[length] === b;
        }
        aStack.push(a);
        bStack.push(b);
        if (areArrays) {
            length = a.length;
            if (length !== b.length)
                return false;
            while (length--) {
                if (!eq(a[length], b[length], aStack, bStack))
                    return false;
            }
        } else {
            var keys = _.keys(a), key;
            length = keys.length;
            if (_.keys(b).length !== length)
                return false;
            while (length--) {
                key = keys[length];
                if (!(has(b, key) && eq(a[key], b[key], aStack, bStack)))
                    return false;
            }
        }
        aStack.pop();
        bStack.pop();
        return true;
    };
    _.isEqual = function (a, b) {
        return eq(a, b);
    };
    _.isEmpty = function (obj) {
        if (obj == null)
            return true;
        if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)))
            return obj.length === 0;
        return _.keys(obj).length === 0;
    };
    _.isElement = function (obj) {
        return !!(obj && obj.nodeType === 1);
    };
    _.isArray = nativeIsArray || function (obj) {
        return toString.call(obj) === '[object Array]';
    };
    _.isObject = function (obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };
    _.each([
        'Arguments',
        'Function',
        'String',
        'Number',
        'Date',
        'RegExp',
        'Error',
        'Symbol',
        'Map',
        'WeakMap',
        'Set',
        'WeakSet'
    ], function (name) {
        _['is' + name] = function (obj) {
            return toString.call(obj) === '[object ' + name + ']';
        };
    });
    if (!_.isArguments(arguments)) {
        _.isArguments = function (obj) {
            return has(obj, 'callee');
        };
    }
    var nodelist = root.document && root.document.childNodes;
    if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
        _.isFunction = function (obj) {
            return typeof obj == 'function' || false;
        };
    }
    _.isFinite = function (obj) {
        return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
    };
    _.isNaN = function (obj) {
        return _.isNumber(obj) && isNaN(obj);
    };
    _.isBoolean = function (obj) {
        return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    };
    _.isNull = function (obj) {
        return obj === null;
    };
    _.isUndefined = function (obj) {
        return obj === void 0;
    };
    _.has = function (obj, path) {
        if (!_.isArray(path)) {
            return has(obj, path);
        }
        var length = path.length;
        for (var i = 0; i < length; i++) {
            var key = path[i];
            if (obj == null || !hasOwnProperty.call(obj, key)) {
                return false;
            }
            obj = obj[key];
        }
        return !!length;
    };
    _.noConflict = function () {
        root._ = previousUnderscore;
        return this;
    };
    _.identity = function (value) {
        return value;
    };
    _.constant = function (value) {
        return function () {
            return value;
        };
    };
    _.noop = function () {
    };
    _.property = function (path) {
        if (!_.isArray(path)) {
            return shallowProperty(path);
        }
        return function (obj) {
            return deepGet(obj, path);
        };
    };
    _.propertyOf = function (obj) {
        if (obj == null) {
            return function () {
            };
        }
        return function (path) {
            return !_.isArray(path) ? obj[path] : deepGet(obj, path);
        };
    };
    _.matcher = _.matches = function (attrs) {
        attrs = _.extendOwn({}, attrs);
        return function (obj) {
            return _.isMatch(obj, attrs);
        };
    };
    _.times = function (n, iteratee, context) {
        var accum = Array(Math.max(0, n));
        iteratee = optimizeCb(iteratee, context, 1);
        for (var i = 0; i < n; i++)
            accum[i] = iteratee(i);
        return accum;
    };
    _.random = function (min, max) {
        if (max == null) {
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };
    _.now = Date.now || function () {
        return new Date().getTime();
    };
    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
    };
    var unescapeMap = _.invert(escapeMap);
    var createEscaper = function (map) {
        var escaper = function (match) {
            return map[match];
        };
        var source = '(?:' + _.keys(map).join('|') + ')';
        var testRegexp = RegExp(source);
        var replaceRegexp = RegExp(source, 'g');
        return function (string) {
            string = string == null ? '' : '' + string;
            return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
        };
    };
    _.escape = createEscaper(escapeMap);
    _.unescape = createEscaper(unescapeMap);
    _.result = function (obj, path, fallback) {
        if (!_.isArray(path))
            path = [path];
        var length = path.length;
        if (!length) {
            return _.isFunction(fallback) ? fallback.call(obj) : fallback;
        }
        for (var i = 0; i < length; i++) {
            var prop = obj == null ? void 0 : obj[path[i]];
            if (prop === void 0) {
                prop = fallback;
                i = length;
            }
            obj = _.isFunction(prop) ? prop.call(obj) : prop;
        }
        return obj;
    };
    var idCounter = 0;
    _.uniqueId = function (prefix) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    };
    _.templateSettings = {
        evaluate: /<%([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%-([\s\S]+?)%>/g
    };
    var noMatch = /(.)^/;
    var escapes = {
        '\'': '\'',
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };
    var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;
    var escapeChar = function (match) {
        return '\\' + escapes[match];
    };
    _.template = function (text, settings, oldSettings) {
        if (!settings && oldSettings)
            settings = oldSettings;
        settings = _.defaults({}, settings, _.templateSettings);
        var matcher = RegExp([
            (settings.escape || noMatch).source,
            (settings.interpolate || noMatch).source,
            (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');
        var index = 0;
        var source = '__p+=\'';
        text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
            index = offset + match.length;
            if (escape) {
                source += '\'+\n((__t=(' + escape + '))==null?\'\':_.escape(__t))+\n\'';
            } else if (interpolate) {
                source += '\'+\n((__t=(' + interpolate + '))==null?\'\':__t)+\n\'';
            } else if (evaluate) {
                source += '\';\n' + evaluate + '\n__p+=\'';
            }
            return match;
        });
        source += '\';\n';
        if (!settings.variable)
            source = 'with(obj||{}){\n' + source + '}\n';
        source = 'var __t,__p=\'\',__j=Array.prototype.join,' + 'print=function(){__p+=__j.call(arguments,\'\');};\n' + source + 'return __p;\n';
        var render;
        try {
            render = new Function(settings.variable || 'obj', '_', source);
        } catch (e) {
            e.source = source;
            throw e;
        }
        var template = function (data) {
            return render.call(this, data, _);
        };
        var argument = settings.variable || 'obj';
        template.source = 'function(' + argument + '){\n' + source + '}';
        return template;
    };
    _.chain = function (obj) {
        var instance = _(obj);
        instance._chain = true;
        return instance;
    };
    var chainResult = function (instance, obj) {
        return instance._chain ? _(obj).chain() : obj;
    };
    _.mixin = function (obj) {
        _.each(_.functions(obj), function (name) {
            var func = _[name] = obj[name];
            _.prototype[name] = function () {
                var args = [this._wrapped];
                push.apply(args, arguments);
                return chainResult(this, func.apply(_, args));
            };
        });
        return _;
    };
    _.mixin(_);
    _.each([
        'pop',
        'push',
        'reverse',
        'shift',
        'sort',
        'splice',
        'unshift'
    ], function (name) {
        var method = ArrayProto[name];
        _.prototype[name] = function () {
            var obj = this._wrapped;
            method.apply(obj, arguments);
            if ((name === 'shift' || name === 'splice') && obj.length === 0)
                delete obj[0];
            return chainResult(this, obj);
        };
    });
    _.each([
        'concat',
        'join',
        'slice'
    ], function (name) {
        var method = ArrayProto[name];
        _.prototype[name] = function () {
            return chainResult(this, method.apply(this._wrapped, arguments));
        };
    });
    _.prototype.value = function () {
        return this._wrapped;
    };
    _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
    _.prototype.toString = function () {
        return String(this._wrapped);
    };
    if (typeof define == 'function' && define.amd) {
        define('underscore@1.9.1#underscore', [], function () {
            return _;
        });
    }
}());
/*backbone@1.3.3#backbone*/
(function (factory) {
    var root = typeof self == 'object' && self.self === self && self || typeof global == 'object' && global.global === global && global;
    if (typeof define === 'function' && define.amd) {
        define('backbone@1.3.3#backbone', [
            'underscore',
            'jquery',
            'exports'
        ], function (_, $, exports) {
            root.Backbone = factory(root, exports, _, $);
        });
    } else if (typeof exports !== 'undefined') {
        var _ = require('underscore'), $;
        try {
            $ = require('jquery');
        } catch (e) {
        }
        factory(root, exports, _, $);
    } else {
        root.Backbone = factory(root, {}, root._, root.jQuery || root.Zepto || root.ender || root.$);
    }
}(function (root, Backbone, _, $) {
    var previousBackbone = root.Backbone;
    var slice = Array.prototype.slice;
    Backbone.VERSION = '1.3.3';
    Backbone.$ = $;
    Backbone.noConflict = function () {
        root.Backbone = previousBackbone;
        return this;
    };
    Backbone.emulateHTTP = false;
    Backbone.emulateJSON = false;
    var addMethod = function (length, method, attribute) {
        switch (length) {
        case 1:
            return function () {
                return _[method](this[attribute]);
            };
        case 2:
            return function (value) {
                return _[method](this[attribute], value);
            };
        case 3:
            return function (iteratee, context) {
                return _[method](this[attribute], cb(iteratee, this), context);
            };
        case 4:
            return function (iteratee, defaultVal, context) {
                return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
            };
        default:
            return function () {
                var args = slice.call(arguments);
                args.unshift(this[attribute]);
                return _[method].apply(_, args);
            };
        }
    };
    var addUnderscoreMethods = function (Class, methods, attribute) {
        _.each(methods, function (length, method) {
            if (_[method])
                Class.prototype[method] = addMethod(length, method, attribute);
        });
    };
    var cb = function (iteratee, instance) {
        if (_.isFunction(iteratee))
            return iteratee;
        if (_.isObject(iteratee) && !instance._isModel(iteratee))
            return modelMatcher(iteratee);
        if (_.isString(iteratee))
            return function (model) {
                return model.get(iteratee);
            };
        return iteratee;
    };
    var modelMatcher = function (attrs) {
        var matcher = _.matches(attrs);
        return function (model) {
            return matcher(model.attributes);
        };
    };
    var Events = Backbone.Events = {};
    var eventSplitter = /\s+/;
    var eventsApi = function (iteratee, events, name, callback, opts) {
        var i = 0, names;
        if (name && typeof name === 'object') {
            if (callback !== void 0 && 'context' in opts && opts.context === void 0)
                opts.context = callback;
            for (names = _.keys(name); i < names.length; i++) {
                events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
            }
        } else if (name && eventSplitter.test(name)) {
            for (names = name.split(eventSplitter); i < names.length; i++) {
                events = iteratee(events, names[i], callback, opts);
            }
        } else {
            events = iteratee(events, name, callback, opts);
        }
        return events;
    };
    Events.on = function (name, callback, context) {
        return internalOn(this, name, callback, context);
    };
    var internalOn = function (obj, name, callback, context, listening) {
        obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
            context: context,
            ctx: obj,
            listening: listening
        });
        if (listening) {
            var listeners = obj._listeners || (obj._listeners = {});
            listeners[listening.id] = listening;
        }
        return obj;
    };
    Events.listenTo = function (obj, name, callback) {
        if (!obj)
            return this;
        var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
        var listeningTo = this._listeningTo || (this._listeningTo = {});
        var listening = listeningTo[id];
        if (!listening) {
            var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
            listening = listeningTo[id] = {
                obj: obj,
                objId: id,
                id: thisId,
                listeningTo: listeningTo,
                count: 0
            };
        }
        internalOn(obj, name, callback, this, listening);
        return this;
    };
    var onApi = function (events, name, callback, options) {
        if (callback) {
            var handlers = events[name] || (events[name] = []);
            var context = options.context, ctx = options.ctx, listening = options.listening;
            if (listening)
                listening.count++;
            handlers.push({
                callback: callback,
                context: context,
                ctx: context || ctx,
                listening: listening
            });
        }
        return events;
    };
    Events.off = function (name, callback, context) {
        if (!this._events)
            return this;
        this._events = eventsApi(offApi, this._events, name, callback, {
            context: context,
            listeners: this._listeners
        });
        return this;
    };
    Events.stopListening = function (obj, name, callback) {
        var listeningTo = this._listeningTo;
        if (!listeningTo)
            return this;
        var ids = obj ? [obj._listenId] : _.keys(listeningTo);
        for (var i = 0; i < ids.length; i++) {
            var listening = listeningTo[ids[i]];
            if (!listening)
                break;
            listening.obj.off(name, callback, this);
        }
        return this;
    };
    var offApi = function (events, name, callback, options) {
        if (!events)
            return;
        var i = 0, listening;
        var context = options.context, listeners = options.listeners;
        if (!name && !callback && !context) {
            var ids = _.keys(listeners);
            for (; i < ids.length; i++) {
                listening = listeners[ids[i]];
                delete listeners[listening.id];
                delete listening.listeningTo[listening.objId];
            }
            return;
        }
        var names = name ? [name] : _.keys(events);
        for (; i < names.length; i++) {
            name = names[i];
            var handlers = events[name];
            if (!handlers)
                break;
            var remaining = [];
            for (var j = 0; j < handlers.length; j++) {
                var handler = handlers[j];
                if (callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
                    remaining.push(handler);
                } else {
                    listening = handler.listening;
                    if (listening && --listening.count === 0) {
                        delete listeners[listening.id];
                        delete listening.listeningTo[listening.objId];
                    }
                }
            }
            if (remaining.length) {
                events[name] = remaining;
            } else {
                delete events[name];
            }
        }
        return events;
    };
    Events.once = function (name, callback, context) {
        var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
        if (typeof name === 'string' && context == null)
            callback = void 0;
        return this.on(events, callback, context);
    };
    Events.listenToOnce = function (obj, name, callback) {
        var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
        return this.listenTo(obj, events);
    };
    var onceMap = function (map, name, callback, offer) {
        if (callback) {
            var once = map[name] = _.once(function () {
                offer(name, once);
                callback.apply(this, arguments);
            });
            once._callback = callback;
        }
        return map;
    };
    Events.trigger = function (name) {
        if (!this._events)
            return this;
        var length = Math.max(0, arguments.length - 1);
        var args = Array(length);
        for (var i = 0; i < length; i++)
            args[i] = arguments[i + 1];
        eventsApi(triggerApi, this._events, name, void 0, args);
        return this;
    };
    var triggerApi = function (objEvents, name, callback, args) {
        if (objEvents) {
            var events = objEvents[name];
            var allEvents = objEvents.all;
            if (events && allEvents)
                allEvents = allEvents.slice();
            if (events)
                triggerEvents(events, args);
            if (allEvents)
                triggerEvents(allEvents, [name].concat(args));
        }
        return objEvents;
    };
    var triggerEvents = function (events, args) {
        var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
        switch (args.length) {
        case 0:
            while (++i < l)
                (ev = events[i]).callback.call(ev.ctx);
            return;
        case 1:
            while (++i < l)
                (ev = events[i]).callback.call(ev.ctx, a1);
            return;
        case 2:
            while (++i < l)
                (ev = events[i]).callback.call(ev.ctx, a1, a2);
            return;
        case 3:
            while (++i < l)
                (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
            return;
        default:
            while (++i < l)
                (ev = events[i]).callback.apply(ev.ctx, args);
            return;
        }
    };
    Events.bind = Events.on;
    Events.unbind = Events.off;
    _.extend(Backbone, Events);
    var Model = Backbone.Model = function (attributes, options) {
        var attrs = attributes || {};
        options || (options = {});
        this.cid = _.uniqueId(this.cidPrefix);
        this.attributes = {};
        if (options.collection)
            this.collection = options.collection;
        if (options.parse)
            attrs = this.parse(attrs, options) || {};
        var defaults = _.result(this, 'defaults');
        attrs = _.defaults(_.extend({}, defaults, attrs), defaults);
        this.set(attrs, options);
        this.changed = {};
        this.initialize.apply(this, arguments);
    };
    _.extend(Model.prototype, Events, {
        changed: null,
        validationError: null,
        idAttribute: 'id',
        cidPrefix: 'c',
        initialize: function () {
        },
        toJSON: function (options) {
            return _.clone(this.attributes);
        },
        sync: function () {
            return Backbone.sync.apply(this, arguments);
        },
        get: function (attr) {
            return this.attributes[attr];
        },
        escape: function (attr) {
            return _.escape(this.get(attr));
        },
        has: function (attr) {
            return this.get(attr) != null;
        },
        matches: function (attrs) {
            return !!_.iteratee(attrs, this)(this.attributes);
        },
        set: function (key, val, options) {
            if (key == null)
                return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }
            options || (options = {});
            if (!this._validate(attrs, options))
                return false;
            var unset = options.unset;
            var silent = options.silent;
            var changes = [];
            var changing = this._changing;
            this._changing = true;
            if (!changing) {
                this._previousAttributes = _.clone(this.attributes);
                this.changed = {};
            }
            var current = this.attributes;
            var changed = this.changed;
            var prev = this._previousAttributes;
            for (var attr in attrs) {
                val = attrs[attr];
                if (!_.isEqual(current[attr], val))
                    changes.push(attr);
                if (!_.isEqual(prev[attr], val)) {
                    changed[attr] = val;
                } else {
                    delete changed[attr];
                }
                unset ? delete current[attr] : current[attr] = val;
            }
            if (this.idAttribute in attrs)
                this.id = this.get(this.idAttribute);
            if (!silent) {
                if (changes.length)
                    this._pending = options;
                for (var i = 0; i < changes.length; i++) {
                    this.trigger('change:' + changes[i], this, current[changes[i]], options);
                }
            }
            if (changing)
                return this;
            if (!silent) {
                while (this._pending) {
                    options = this._pending;
                    this._pending = false;
                    this.trigger('change', this, options);
                }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },
        unset: function (attr, options) {
            return this.set(attr, void 0, _.extend({}, options, { unset: true }));
        },
        clear: function (options) {
            var attrs = {};
            for (var key in this.attributes)
                attrs[key] = void 0;
            return this.set(attrs, _.extend({}, options, { unset: true }));
        },
        hasChanged: function (attr) {
            if (attr == null)
                return !_.isEmpty(this.changed);
            return _.has(this.changed, attr);
        },
        changedAttributes: function (diff) {
            if (!diff)
                return this.hasChanged() ? _.clone(this.changed) : false;
            var old = this._changing ? this._previousAttributes : this.attributes;
            var changed = {};
            for (var attr in diff) {
                var val = diff[attr];
                if (_.isEqual(old[attr], val))
                    continue;
                changed[attr] = val;
            }
            return _.size(changed) ? changed : false;
        },
        previous: function (attr) {
            if (attr == null || !this._previousAttributes)
                return null;
            return this._previousAttributes[attr];
        },
        previousAttributes: function () {
            return _.clone(this._previousAttributes);
        },
        fetch: function (options) {
            options = _.extend({ parse: true }, options);
            var model = this;
            var success = options.success;
            options.success = function (resp) {
                var serverAttrs = options.parse ? model.parse(resp, options) : resp;
                if (!model.set(serverAttrs, options))
                    return false;
                if (success)
                    success.call(options.context, model, resp, options);
                model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);
            return this.sync('read', this, options);
        },
        save: function (key, val, options) {
            var attrs;
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }
            options = _.extend({
                validate: true,
                parse: true
            }, options);
            var wait = options.wait;
            if (attrs && !wait) {
                if (!this.set(attrs, options))
                    return false;
            } else if (!this._validate(attrs, options)) {
                return false;
            }
            var model = this;
            var success = options.success;
            var attributes = this.attributes;
            options.success = function (resp) {
                model.attributes = attributes;
                var serverAttrs = options.parse ? model.parse(resp, options) : resp;
                if (wait)
                    serverAttrs = _.extend({}, attrs, serverAttrs);
                if (serverAttrs && !model.set(serverAttrs, options))
                    return false;
                if (success)
                    success.call(options.context, model, resp, options);
                model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);
            if (attrs && wait)
                this.attributes = _.extend({}, attributes, attrs);
            var method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';
            if (method === 'patch' && !options.attrs)
                options.attrs = attrs;
            var xhr = this.sync(method, this, options);
            this.attributes = attributes;
            return xhr;
        },
        destroy: function (options) {
            options = options ? _.clone(options) : {};
            var model = this;
            var success = options.success;
            var wait = options.wait;
            var destroy = function () {
                model.stopListening();
                model.trigger('destroy', model, model.collection, options);
            };
            options.success = function (resp) {
                if (wait)
                    destroy();
                if (success)
                    success.call(options.context, model, resp, options);
                if (!model.isNew())
                    model.trigger('sync', model, resp, options);
            };
            var xhr = false;
            if (this.isNew()) {
                _.defer(options.success);
            } else {
                wrapError(this, options);
                xhr = this.sync('delete', this, options);
            }
            if (!wait)
                destroy();
            return xhr;
        },
        url: function () {
            var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
            if (this.isNew())
                return base;
            var id = this.get(this.idAttribute);
            return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
        },
        parse: function (resp, options) {
            return resp;
        },
        clone: function () {
            return new this.constructor(this.attributes);
        },
        isNew: function () {
            return !this.has(this.idAttribute);
        },
        isValid: function (options) {
            return this._validate({}, _.extend({}, options, { validate: true }));
        },
        _validate: function (attrs, options) {
            if (!options.validate || !this.validate)
                return true;
            attrs = _.extend({}, this.attributes, attrs);
            var error = this.validationError = this.validate(attrs, options) || null;
            if (!error)
                return true;
            this.trigger('invalid', this, error, _.extend(options, { validationError: error }));
            return false;
        }
    });
    var modelMethods = {
        keys: 1,
        values: 1,
        pairs: 1,
        invert: 1,
        pick: 0,
        omit: 0,
        chain: 1,
        isEmpty: 1
    };
    addUnderscoreMethods(Model, modelMethods, 'attributes');
    var Collection = Backbone.Collection = function (models, options) {
        options || (options = {});
        if (options.model)
            this.model = options.model;
        if (options.comparator !== void 0)
            this.comparator = options.comparator;
        this._reset();
        this.initialize.apply(this, arguments);
        if (models)
            this.reset(models, _.extend({ silent: true }, options));
    };
    var setOptions = {
        add: true,
        remove: true,
        merge: true
    };
    var addOptions = {
        add: true,
        remove: false
    };
    var splice = function (array, insert, at) {
        at = Math.min(Math.max(at, 0), array.length);
        var tail = Array(array.length - at);
        var length = insert.length;
        var i;
        for (i = 0; i < tail.length; i++)
            tail[i] = array[i + at];
        for (i = 0; i < length; i++)
            array[i + at] = insert[i];
        for (i = 0; i < tail.length; i++)
            array[i + length + at] = tail[i];
    };
    _.extend(Collection.prototype, Events, {
        model: Model,
        initialize: function () {
        },
        toJSON: function (options) {
            return this.map(function (model) {
                return model.toJSON(options);
            });
        },
        sync: function () {
            return Backbone.sync.apply(this, arguments);
        },
        add: function (models, options) {
            return this.set(models, _.extend({ merge: false }, options, addOptions));
        },
        remove: function (models, options) {
            options = _.extend({}, options);
            var singular = !_.isArray(models);
            models = singular ? [models] : models.slice();
            var removed = this._removeModels(models, options);
            if (!options.silent && removed.length) {
                options.changes = {
                    added: [],
                    merged: [],
                    removed: removed
                };
                this.trigger('update', this, options);
            }
            return singular ? removed[0] : removed;
        },
        set: function (models, options) {
            if (models == null)
                return;
            options = _.extend({}, setOptions, options);
            if (options.parse && !this._isModel(models)) {
                models = this.parse(models, options) || [];
            }
            var singular = !_.isArray(models);
            models = singular ? [models] : models.slice();
            var at = options.at;
            if (at != null)
                at = +at;
            if (at > this.length)
                at = this.length;
            if (at < 0)
                at += this.length + 1;
            var set = [];
            var toAdd = [];
            var toMerge = [];
            var toRemove = [];
            var modelMap = {};
            var add = options.add;
            var merge = options.merge;
            var remove = options.remove;
            var sort = false;
            var sortable = this.comparator && at == null && options.sort !== false;
            var sortAttr = _.isString(this.comparator) ? this.comparator : null;
            var model, i;
            for (i = 0; i < models.length; i++) {
                model = models[i];
                var existing = this.get(model);
                if (existing) {
                    if (merge && model !== existing) {
                        var attrs = this._isModel(model) ? model.attributes : model;
                        if (options.parse)
                            attrs = existing.parse(attrs, options);
                        existing.set(attrs, options);
                        toMerge.push(existing);
                        if (sortable && !sort)
                            sort = existing.hasChanged(sortAttr);
                    }
                    if (!modelMap[existing.cid]) {
                        modelMap[existing.cid] = true;
                        set.push(existing);
                    }
                    models[i] = existing;
                } else if (add) {
                    model = models[i] = this._prepareModel(model, options);
                    if (model) {
                        toAdd.push(model);
                        this._addReference(model, options);
                        modelMap[model.cid] = true;
                        set.push(model);
                    }
                }
            }
            if (remove) {
                for (i = 0; i < this.length; i++) {
                    model = this.models[i];
                    if (!modelMap[model.cid])
                        toRemove.push(model);
                }
                if (toRemove.length)
                    this._removeModels(toRemove, options);
            }
            var orderChanged = false;
            var replace = !sortable && add && remove;
            if (set.length && replace) {
                orderChanged = this.length !== set.length || _.some(this.models, function (m, index) {
                    return m !== set[index];
                });
                this.models.length = 0;
                splice(this.models, set, 0);
                this.length = this.models.length;
            } else if (toAdd.length) {
                if (sortable)
                    sort = true;
                splice(this.models, toAdd, at == null ? this.length : at);
                this.length = this.models.length;
            }
            if (sort)
                this.sort({ silent: true });
            if (!options.silent) {
                for (i = 0; i < toAdd.length; i++) {
                    if (at != null)
                        options.index = at + i;
                    model = toAdd[i];
                    model.trigger('add', model, this, options);
                }
                if (sort || orderChanged)
                    this.trigger('sort', this, options);
                if (toAdd.length || toRemove.length || toMerge.length) {
                    options.changes = {
                        added: toAdd,
                        removed: toRemove,
                        merged: toMerge
                    };
                    this.trigger('update', this, options);
                }
            }
            return singular ? models[0] : models;
        },
        reset: function (models, options) {
            options = options ? _.clone(options) : {};
            for (var i = 0; i < this.models.length; i++) {
                this._removeReference(this.models[i], options);
            }
            options.previousModels = this.models;
            this._reset();
            models = this.add(models, _.extend({ silent: true }, options));
            if (!options.silent)
                this.trigger('reset', this, options);
            return models;
        },
        push: function (model, options) {
            return this.add(model, _.extend({ at: this.length }, options));
        },
        pop: function (options) {
            var model = this.at(this.length - 1);
            return this.remove(model, options);
        },
        unshift: function (model, options) {
            return this.add(model, _.extend({ at: 0 }, options));
        },
        shift: function (options) {
            var model = this.at(0);
            return this.remove(model, options);
        },
        slice: function () {
            return slice.apply(this.models, arguments);
        },
        get: function (obj) {
            if (obj == null)
                return void 0;
            return this._byId[obj] || this._byId[this.modelId(obj.attributes || obj)] || obj.cid && this._byId[obj.cid];
        },
        has: function (obj) {
            return this.get(obj) != null;
        },
        at: function (index) {
            if (index < 0)
                index += this.length;
            return this.models[index];
        },
        where: function (attrs, first) {
            return this[first ? 'find' : 'filter'](attrs);
        },
        findWhere: function (attrs) {
            return this.where(attrs, true);
        },
        sort: function (options) {
            var comparator = this.comparator;
            if (!comparator)
                throw new Error('Cannot sort a set without a comparator');
            options || (options = {});
            var length = comparator.length;
            if (_.isFunction(comparator))
                comparator = _.bind(comparator, this);
            if (length === 1 || _.isString(comparator)) {
                this.models = this.sortBy(comparator);
            } else {
                this.models.sort(comparator);
            }
            if (!options.silent)
                this.trigger('sort', this, options);
            return this;
        },
        pluck: function (attr) {
            return this.map(attr + '');
        },
        fetch: function (options) {
            options = _.extend({ parse: true }, options);
            var success = options.success;
            var collection = this;
            options.success = function (resp) {
                var method = options.reset ? 'reset' : 'set';
                collection[method](resp, options);
                if (success)
                    success.call(options.context, collection, resp, options);
                collection.trigger('sync', collection, resp, options);
            };
            wrapError(this, options);
            return this.sync('read', this, options);
        },
        create: function (model, options) {
            options = options ? _.clone(options) : {};
            var wait = options.wait;
            model = this._prepareModel(model, options);
            if (!model)
                return false;
            if (!wait)
                this.add(model, options);
            var collection = this;
            var success = options.success;
            options.success = function (m, resp, callbackOpts) {
                if (wait)
                    collection.add(m, callbackOpts);
                if (success)
                    success.call(callbackOpts.context, m, resp, callbackOpts);
            };
            model.save(null, options);
            return model;
        },
        parse: function (resp, options) {
            return resp;
        },
        clone: function () {
            return new this.constructor(this.models, {
                model: this.model,
                comparator: this.comparator
            });
        },
        modelId: function (attrs) {
            return attrs[this.model.prototype.idAttribute || 'id'];
        },
        _reset: function () {
            this.length = 0;
            this.models = [];
            this._byId = {};
        },
        _prepareModel: function (attrs, options) {
            if (this._isModel(attrs)) {
                if (!attrs.collection)
                    attrs.collection = this;
                return attrs;
            }
            options = options ? _.clone(options) : {};
            options.collection = this;
            var model = new this.model(attrs, options);
            if (!model.validationError)
                return model;
            this.trigger('invalid', this, model.validationError, options);
            return false;
        },
        _removeModels: function (models, options) {
            var removed = [];
            for (var i = 0; i < models.length; i++) {
                var model = this.get(models[i]);
                if (!model)
                    continue;
                var index = this.indexOf(model);
                this.models.splice(index, 1);
                this.length--;
                delete this._byId[model.cid];
                var id = this.modelId(model.attributes);
                if (id != null)
                    delete this._byId[id];
                if (!options.silent) {
                    options.index = index;
                    model.trigger('remove', model, this, options);
                }
                removed.push(model);
                this._removeReference(model, options);
            }
            return removed;
        },
        _isModel: function (model) {
            return model instanceof Model;
        },
        _addReference: function (model, options) {
            this._byId[model.cid] = model;
            var id = this.modelId(model.attributes);
            if (id != null)
                this._byId[id] = model;
            model.on('all', this._onModelEvent, this);
        },
        _removeReference: function (model, options) {
            delete this._byId[model.cid];
            var id = this.modelId(model.attributes);
            if (id != null)
                delete this._byId[id];
            if (this === model.collection)
                delete model.collection;
            model.off('all', this._onModelEvent, this);
        },
        _onModelEvent: function (event, model, collection, options) {
            if (model) {
                if ((event === 'add' || event === 'remove') && collection !== this)
                    return;
                if (event === 'destroy')
                    this.remove(model, options);
                if (event === 'change') {
                    var prevId = this.modelId(model.previousAttributes());
                    var id = this.modelId(model.attributes);
                    if (prevId !== id) {
                        if (prevId != null)
                            delete this._byId[prevId];
                        if (id != null)
                            this._byId[id] = model;
                    }
                }
            }
            this.trigger.apply(this, arguments);
        }
    });
    var collectionMethods = {
        forEach: 3,
        each: 3,
        map: 3,
        collect: 3,
        reduce: 0,
        foldl: 0,
        inject: 0,
        reduceRight: 0,
        foldr: 0,
        find: 3,
        detect: 3,
        filter: 3,
        select: 3,
        reject: 3,
        every: 3,
        all: 3,
        some: 3,
        any: 3,
        include: 3,
        includes: 3,
        contains: 3,
        invoke: 0,
        max: 3,
        min: 3,
        toArray: 1,
        size: 1,
        first: 3,
        head: 3,
        take: 3,
        initial: 3,
        rest: 3,
        tail: 3,
        drop: 3,
        last: 3,
        without: 0,
        difference: 0,
        indexOf: 3,
        shuffle: 1,
        lastIndexOf: 3,
        isEmpty: 1,
        chain: 1,
        sample: 3,
        partition: 3,
        groupBy: 3,
        countBy: 3,
        sortBy: 3,
        indexBy: 3,
        findIndex: 3,
        findLastIndex: 3
    };
    addUnderscoreMethods(Collection, collectionMethods, 'models');
    var View = Backbone.View = function (options) {
        this.cid = _.uniqueId('view');
        _.extend(this, _.pick(options, viewOptions));
        this._ensureElement();
        this.initialize.apply(this, arguments);
    };
    var delegateEventSplitter = /^(\S+)\s*(.*)$/;
    var viewOptions = [
        'model',
        'collection',
        'el',
        'id',
        'attributes',
        'className',
        'tagName',
        'events'
    ];
    _.extend(View.prototype, Events, {
        tagName: 'div',
        $: function (selector) {
            return this.$el.find(selector);
        },
        initialize: function () {
        },
        render: function () {
            return this;
        },
        remove: function () {
            this._removeElement();
            this.stopListening();
            return this;
        },
        _removeElement: function () {
            this.$el.remove();
        },
        setElement: function (element) {
            this.undelegateEvents();
            this._setElement(element);
            this.delegateEvents();
            return this;
        },
        _setElement: function (el) {
            this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
            this.el = this.$el[0];
        },
        delegateEvents: function (events) {
            events || (events = _.result(this, 'events'));
            if (!events)
                return this;
            this.undelegateEvents();
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method))
                    method = this[method];
                if (!method)
                    continue;
                var match = key.match(delegateEventSplitter);
                this.delegate(match[1], match[2], _.bind(method, this));
            }
            return this;
        },
        delegate: function (eventName, selector, listener) {
            this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },
        undelegateEvents: function () {
            if (this.$el)
                this.$el.off('.delegateEvents' + this.cid);
            return this;
        },
        undelegate: function (eventName, selector, listener) {
            this.$el.off(eventName + '.delegateEvents' + this.cid, selector, listener);
            return this;
        },
        _createElement: function (tagName) {
            return document.createElement(tagName);
        },
        _ensureElement: function () {
            if (!this.el) {
                var attrs = _.extend({}, _.result(this, 'attributes'));
                if (this.id)
                    attrs.id = _.result(this, 'id');
                if (this.className)
                    attrs['class'] = _.result(this, 'className');
                this.setElement(this._createElement(_.result(this, 'tagName')));
                this._setAttributes(attrs);
            } else {
                this.setElement(_.result(this, 'el'));
            }
        },
        _setAttributes: function (attributes) {
            this.$el.attr(attributes);
        }
    });
    Backbone.sync = function (method, model, options) {
        var type = methodMap[method];
        _.defaults(options || (options = {}), {
            emulateHTTP: Backbone.emulateHTTP,
            emulateJSON: Backbone.emulateJSON
        });
        var params = {
            type: type,
            dataType: 'json'
        };
        if (!options.url) {
            params.url = _.result(model, 'url') || urlError();
        }
        if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
            params.contentType = 'application/json';
            params.data = JSON.stringify(options.attrs || model.toJSON(options));
        }
        if (options.emulateJSON) {
            params.contentType = 'application/x-www-form-urlencoded';
            params.data = params.data ? { model: params.data } : {};
        }
        if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
            params.type = 'POST';
            if (options.emulateJSON)
                params.data._method = type;
            var beforeSend = options.beforeSend;
            options.beforeSend = function (xhr) {
                xhr.setRequestHeader('X-HTTP-Method-Override', type);
                if (beforeSend)
                    return beforeSend.apply(this, arguments);
            };
        }
        if (params.type !== 'GET' && !options.emulateJSON) {
            params.processData = false;
        }
        var error = options.error;
        options.error = function (xhr, textStatus, errorThrown) {
            options.textStatus = textStatus;
            options.errorThrown = errorThrown;
            if (error)
                error.call(options.context, xhr, textStatus, errorThrown);
        };
        var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
        model.trigger('request', model, xhr, options);
        return xhr;
    };
    var methodMap = {
        'create': 'POST',
        'update': 'PUT',
        'patch': 'PATCH',
        'delete': 'DELETE',
        'read': 'GET'
    };
    Backbone.ajax = function () {
        return Backbone.$.ajax.apply(Backbone.$, arguments);
    };
    var Router = Backbone.Router = function (options) {
        options || (options = {});
        if (options.routes)
            this.routes = options.routes;
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    };
    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    _.extend(Router.prototype, Events, {
        initialize: function () {
        },
        route: function (route, name, callback) {
            if (!_.isRegExp(route))
                route = this._routeToRegExp(route);
            if (_.isFunction(name)) {
                callback = name;
                name = '';
            }
            if (!callback)
                callback = this[name];
            var router = this;
            Backbone.history.route(route, function (fragment) {
                var args = router._extractParameters(route, fragment);
                if (router.execute(callback, args, name) !== false) {
                    router.trigger.apply(router, ['route:' + name].concat(args));
                    router.trigger('route', name, args);
                    Backbone.history.trigger('route', router, name, args);
                }
            });
            return this;
        },
        execute: function (callback, args, name) {
            if (callback)
                callback.apply(this, args);
        },
        navigate: function (fragment, options) {
            Backbone.history.navigate(fragment, options);
            return this;
        },
        _bindRoutes: function () {
            if (!this.routes)
                return;
            this.routes = _.result(this, 'routes');
            var route, routes = _.keys(this.routes);
            while ((route = routes.pop()) != null) {
                this.route(route, this.routes[route]);
            }
        },
        _routeToRegExp: function (route) {
            route = route.replace(escapeRegExp, '\\$&').replace(optionalParam, '(?:$1)?').replace(namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            }).replace(splatParam, '([^?]*?)');
            return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
        },
        _extractParameters: function (route, fragment) {
            var params = route.exec(fragment).slice(1);
            return _.map(params, function (param, i) {
                if (i === params.length - 1)
                    return param || null;
                return param ? decodeURIComponent(param) : null;
            });
        }
    });
    var History = Backbone.History = function () {
        this.handlers = [];
        this.checkUrl = _.bind(this.checkUrl, this);
        if (typeof window !== 'undefined') {
            this.location = window.location;
            this.history = window.history;
        }
    };
    var routeStripper = /^[#\/]|\s+$/g;
    var rootStripper = /^\/+|\/+$/g;
    var pathStripper = /#.*$/;
    History.started = false;
    _.extend(History.prototype, Events, {
        interval: 50,
        atRoot: function () {
            var path = this.location.pathname.replace(/[^\/]$/, '$&/');
            return path === this.root && !this.getSearch();
        },
        matchRoot: function () {
            var path = this.decodeFragment(this.location.pathname);
            var rootPath = path.slice(0, this.root.length - 1) + '/';
            return rootPath === this.root;
        },
        decodeFragment: function (fragment) {
            return decodeURI(fragment.replace(/%25/g, '%2525'));
        },
        getSearch: function () {
            var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
            return match ? match[0] : '';
        },
        getHash: function (window) {
            var match = (window || this).location.href.match(/#(.*)$/);
            return match ? match[1] : '';
        },
        getPath: function () {
            var path = this.decodeFragment(this.location.pathname + this.getSearch()).slice(this.root.length - 1);
            return path.charAt(0) === '/' ? path.slice(1) : path;
        },
        getFragment: function (fragment) {
            if (fragment == null) {
                if (this._usePushState || !this._wantsHashChange) {
                    fragment = this.getPath();
                } else {
                    fragment = this.getHash();
                }
            }
            return fragment.replace(routeStripper, '');
        },
        start: function (options) {
            if (History.started)
                throw new Error('Backbone.history has already been started');
            History.started = true;
            this.options = _.extend({ root: '/' }, this.options, options);
            this.root = this.options.root;
            this._wantsHashChange = this.options.hashChange !== false;
            this._hasHashChange = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
            this._useHashChange = this._wantsHashChange && this._hasHashChange;
            this._wantsPushState = !!this.options.pushState;
            this._hasPushState = !!(this.history && this.history.pushState);
            this._usePushState = this._wantsPushState && this._hasPushState;
            this.fragment = this.getFragment();
            this.root = ('/' + this.root + '/').replace(rootStripper, '/');
            if (this._wantsHashChange && this._wantsPushState) {
                if (!this._hasPushState && !this.atRoot()) {
                    var rootPath = this.root.slice(0, -1) || '/';
                    this.location.replace(rootPath + '#' + this.getPath());
                    return true;
                } else if (this._hasPushState && this.atRoot()) {
                    this.navigate(this.getHash(), { replace: true });
                }
            }
            if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
                this.iframe = document.createElement('iframe');
                this.iframe.src = 'javascript:0';
                this.iframe.style.display = 'none';
                this.iframe.tabIndex = -1;
                var body = document.body;
                var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
                iWindow.document.open();
                iWindow.document.close();
                iWindow.location.hash = '#' + this.fragment;
            }
            var addEventListener = window.addEventListener || function (eventName, listener) {
                return attachEvent('on' + eventName, listener);
            };
            if (this._usePushState) {
                addEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange && !this.iframe) {
                addEventListener('hashchange', this.checkUrl, false);
            } else if (this._wantsHashChange) {
                this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
            }
            if (!this.options.silent)
                return this.loadUrl();
        },
        stop: function () {
            var removeEventListener = window.removeEventListener || function (eventName, listener) {
                return detachEvent('on' + eventName, listener);
            };
            if (this._usePushState) {
                removeEventListener('popstate', this.checkUrl, false);
            } else if (this._useHashChange && !this.iframe) {
                removeEventListener('hashchange', this.checkUrl, false);
            }
            if (this.iframe) {
                document.body.removeChild(this.iframe);
                this.iframe = null;
            }
            if (this._checkUrlInterval)
                clearInterval(this._checkUrlInterval);
            History.started = false;
        },
        route: function (route, callback) {
            this.handlers.unshift({
                route: route,
                callback: callback
            });
        },
        checkUrl: function (e) {
            var current = this.getFragment();
            if (current === this.fragment && this.iframe) {
                current = this.getHash(this.iframe.contentWindow);
            }
            if (current === this.fragment)
                return false;
            if (this.iframe)
                this.navigate(current);
            this.loadUrl();
        },
        loadUrl: function (fragment) {
            if (!this.matchRoot())
                return false;
            fragment = this.fragment = this.getFragment(fragment);
            return _.some(this.handlers, function (handler) {
                if (handler.route.test(fragment)) {
                    handler.callback(fragment);
                    return true;
                }
            });
        },
        navigate: function (fragment, options) {
            if (!History.started)
                return false;
            if (!options || options === true)
                options = { trigger: !!options };
            fragment = this.getFragment(fragment || '');
            var rootPath = this.root;
            if (fragment === '' || fragment.charAt(0) === '?') {
                rootPath = rootPath.slice(0, -1) || '/';
            }
            var url = rootPath + fragment;
            fragment = this.decodeFragment(fragment.replace(pathStripper, ''));
            if (this.fragment === fragment)
                return;
            this.fragment = fragment;
            if (this._usePushState) {
                this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
            } else if (this._wantsHashChange) {
                this._updateHash(this.location, fragment, options.replace);
                if (this.iframe && fragment !== this.getHash(this.iframe.contentWindow)) {
                    var iWindow = this.iframe.contentWindow;
                    if (!options.replace) {
                        iWindow.document.open();
                        iWindow.document.close();
                    }
                    this._updateHash(iWindow.location, fragment, options.replace);
                }
            } else {
                return this.location.assign(url);
            }
            if (options.trigger)
                return this.loadUrl(fragment);
        },
        _updateHash: function (location, fragment, replace) {
            if (replace) {
                var href = location.href.replace(/(javascript:|#).*$/, '');
                location.replace(href + '#' + fragment);
            } else {
                location.hash = '#' + fragment;
            }
        }
    });
    Backbone.history = new History();
    var extend = function (protoProps, staticProps) {
        var parent = this;
        var child;
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            };
        }
        _.extend(child, parent, staticProps);
        child.prototype = _.create(parent.prototype, protoProps);
        child.prototype.constructor = child;
        child.__super__ = parent.prototype;
        return child;
    };
    Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;
    var urlError = function () {
        throw new Error('A "url" property or function must be specified');
    };
    var wrapError = function (model, options) {
        var error = options.error;
        options.error = function (resp) {
            if (error)
                error.call(options.context, model, resp, options);
            model.trigger('error', model, resp, options);
        };
    };
    return Backbone;
}));
/*can-namespace@1.0.0#can-namespace*/
define('can-namespace@1.0.0#can-namespace', function (require, exports, module) {
    module.exports = {};
});
/*can-log@1.0.0#can-log*/
define('can-log@1.0.0#can-log', function (require, exports, module) {
    'use strict';
    exports.warnTimeout = 5000;
    exports.logLevel = 0;
    exports.warn = function () {
        var ll = this.logLevel;
        if (ll < 2) {
            if (typeof console !== 'undefined' && console.warn) {
                this._logger('warn', Array.prototype.slice.call(arguments));
            } else if (typeof console !== 'undefined' && console.log) {
                this._logger('log', Array.prototype.slice.call(arguments));
            }
        }
    };
    exports.log = function () {
        var ll = this.logLevel;
        if (ll < 1) {
            if (typeof console !== 'undefined' && console.log) {
                this._logger('log', Array.prototype.slice.call(arguments));
            }
        }
    };
    exports.error = function () {
        var ll = this.logLevel;
        if (ll < 1) {
            if (typeof console !== 'undefined' && console.error) {
                this._logger('error', Array.prototype.slice.call(arguments));
            }
        }
    };
    exports._logger = function (type, arr) {
        try {
            console[type].apply(console, arr);
        } catch (e) {
            console[type](arr);
        }
    };
});
/*can-log@1.0.0#dev/dev*/
define('can-log@1.0.0#dev/dev', [
    'require',
    'exports',
    'module',
    '../can-log'
], function (require, exports, module) {
    'use strict';
    var canLog = require('../can-log');
    module.exports = {
        warnTimeout: 5000,
        logLevel: 0,
        stringify: function (value) {
            var flagUndefined = function flagUndefined(key, value) {
                return value === undefined ? '/* void(undefined) */' : value;
            };
            return JSON.stringify(value, flagUndefined, '  ').replace(/"\/\* void\(undefined\) \*\/"/g, 'undefined');
        },
        warn: function () {
        },
        log: function () {
        },
        error: function () {
        },
        _logger: canLog._logger
    };
});
/*can-attribute-encoder@1.1.0#can-attribute-encoder*/
define('can-attribute-encoder@1.1.0#can-attribute-encoder', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-log/dev/dev'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var dev = require('can-log/dev/dev');
    function each(items, callback) {
        for (var i = 0; i < items.length; i++) {
            callback(items[i], i);
        }
    }
    function makeMap(str) {
        var obj = {}, items = str.split(',');
        each(items, function (name) {
            obj[name] = true;
        });
        return obj;
    }
    var caseMattersAttributes = makeMap('allowReorder,attributeName,attributeType,autoReverse,baseFrequency,baseProfile,calcMode,clipPathUnits,contentScriptType,contentStyleType,diffuseConstant,edgeMode,externalResourcesRequired,filterRes,filterUnits,glyphRef,gradientTransform,gradientUnits,kernelMatrix,kernelUnitLength,keyPoints,keySplines,keyTimes,lengthAdjust,limitingConeAngle,markerHeight,markerUnits,markerWidth,maskContentUnits,maskUnits,patternContentUnits,patternTransform,patternUnits,pointsAtX,pointsAtY,pointsAtZ,preserveAlpha,preserveAspectRatio,primitiveUnits,repeatCount,repeatDur,requiredExtensions,requiredFeatures,specularConstant,specularExponent,spreadMethod,startOffset,stdDeviation,stitchTiles,surfaceScale,systemLanguage,tableValues,textLength,viewBox,viewTarget,xChannelSelector,yChannelSelector');
    function camelCaseToSpinalCase(match, lowerCaseChar, upperCaseChar) {
        return lowerCaseChar + '-' + upperCaseChar.toLowerCase();
    }
    function startsWith(allOfIt, startsWith) {
        return allOfIt.indexOf(startsWith) === 0;
    }
    function endsWith(allOfIt, endsWith) {
        return allOfIt.length - allOfIt.indexOf(endsWith) === endsWith.length;
    }
    var regexes = {
        leftParens: /\(/g,
        rightParens: /\)/g,
        leftBrace: /\{/g,
        rightBrace: /\}/g,
        camelCase: /([a-z]|^)([A-Z])/g,
        forwardSlash: /\//g,
        space: /\s/g,
        uppercase: /[A-Z]/g,
        uppercaseDelimiterThenChar: /:u:([a-z])/g,
        caret: /\^/g,
        dollar: /\$/g,
        at: /@/g
    };
    var delimiters = {
        prependUppercase: ':u:',
        replaceSpace: ':s:',
        replaceForwardSlash: ':f:',
        replaceLeftParens: ':lp:',
        replaceRightParens: ':rp:',
        replaceLeftBrace: ':lb:',
        replaceRightBrace: ':rb:',
        replaceCaret: ':c:',
        replaceDollar: ':d:',
        replaceAt: ':at:'
    };
    var encoder = {};
    encoder.encode = function (name) {
        var encoded = name;
        if (!caseMattersAttributes[encoded] && encoded.match(regexes.camelCase)) {
            if (startsWith(encoded, 'on:') || endsWith(encoded, ':to') || endsWith(encoded, ':from') || endsWith(encoded, ':bind') || endsWith(encoded, ':raw')) {
                encoded = encoded.replace(regexes.uppercase, function (char) {
                    return delimiters.prependUppercase + char.toLowerCase();
                });
            } else if (startsWith(encoded, '(') || startsWith(encoded, '{')) {
                encoded = encoded.replace(regexes.camelCase, camelCaseToSpinalCase);
            }
        }
        encoded = encoded.replace(regexes.space, delimiters.replaceSpace).replace(regexes.forwardSlash, delimiters.replaceForwardSlash).replace(regexes.leftParens, delimiters.replaceLeftParens).replace(regexes.rightParens, delimiters.replaceRightParens).replace(regexes.leftBrace, delimiters.replaceLeftBrace).replace(regexes.rightBrace, delimiters.replaceRightBrace).replace(regexes.caret, delimiters.replaceCaret).replace(regexes.dollar, delimiters.replaceDollar).replace(regexes.at, delimiters.replaceAt);
        return encoded;
    };
    encoder.decode = function (name) {
        var decoded = name;
        if (!caseMattersAttributes[decoded] && decoded.match(regexes.uppercaseDelimiterThenChar)) {
            if (startsWith(decoded, 'on:') || endsWith(decoded, ':to') || endsWith(decoded, ':from') || endsWith(decoded, ':bind') || endsWith(decoded, ':raw')) {
                decoded = decoded.replace(regexes.uppercaseDelimiterThenChar, function (match, char) {
                    return char.toUpperCase();
                });
            }
        }
        decoded = decoded.replace(delimiters.replaceLeftParens, '(').replace(delimiters.replaceRightParens, ')').replace(delimiters.replaceLeftBrace, '{').replace(delimiters.replaceRightBrace, '}').replace(delimiters.replaceForwardSlash, '/').replace(delimiters.replaceSpace, ' ').replace(delimiters.replaceCaret, '^').replace(delimiters.replaceDollar, '$').replace(delimiters.replaceAt, '@');
        return decoded;
    };
    if (namespace.encoder) {
        throw new Error('You can\'t have two versions of can-attribute-encoder, check your dependencies');
    } else {
        module.exports = namespace.encoder = encoder;
    }
});
/*can-view-parser@4.1.1#can-view-parser*/
define('can-view-parser@4.1.1#can-view-parser', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-log/dev/dev',
    'can-attribute-encoder'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace'), dev = require('can-log/dev/dev'), encoder = require('can-attribute-encoder');
    function each(items, callback) {
        for (var i = 0; i < items.length; i++) {
            callback(items[i], i);
        }
    }
    function makeMap(str) {
        var obj = {}, items = str.split(',');
        each(items, function (name) {
            obj[name] = true;
        });
        return obj;
    }
    function handleIntermediate(intermediate, handler) {
        for (var i = 0, len = intermediate.length; i < len; i++) {
            var item = intermediate[i];
            handler[item.tokenType].apply(handler, item.args);
        }
        return intermediate;
    }
    var alphaNumeric = 'A-Za-z0-9', alphaNumericHU = '-:_' + alphaNumeric, magicStart = '{{', endTag = new RegExp('^<\\/([' + alphaNumericHU + ']+)[^>]*>'), magicMatch = new RegExp('\\{\\{(![\\s\\S]*?!|[\\s\\S]*?)\\}\\}\\}?', 'g'), space = /\s/, alphaRegex = new RegExp('[' + alphaNumeric + ']'), attributeRegexp = new RegExp('[' + alphaNumericHU + ']+s*=s*("[^"]*"|\'[^\']*\')');
    var empty = makeMap('area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed');
    var caseMattersElements = makeMap('altGlyph,altGlyphDef,altGlyphItem,animateColor,animateMotion,animateTransform,clipPath,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,foreignObject,glyphRef,linearGradient,radialGradient,textPath');
    var closeSelf = makeMap('colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr');
    var special = makeMap('script');
    var tokenTypes = 'start,end,close,attrStart,attrEnd,attrValue,chars,comment,special,done'.split(',');
    var startOppositesMap = {
        '{': '}',
        '(': ')'
    };
    var fn = function () {
    };
    var HTMLParser = function (html, handler, returnIntermediate) {
        if (typeof html === 'object') {
            return handleIntermediate(html, handler);
        }
        var intermediate = [];
        handler = handler || {};
        if (returnIntermediate) {
            each(tokenTypes, function (name) {
                var callback = handler[name] || fn;
                handler[name] = function () {
                    if (callback.apply(this, arguments) !== false) {
                        var end = arguments.length;
                        if (arguments[end - 1] === undefined) {
                            end = arguments.length - 1;
                        }
                        intermediate.push({
                            tokenType: name,
                            args: [].slice.call(arguments, 0, end)
                        });
                    }
                };
            });
        }
        function parseStartTag(tag, tagName, rest, unary) {
            tagName = caseMattersElements[tagName] ? tagName : tagName.toLowerCase();
            if (closeSelf[tagName] && stack.last() === tagName) {
                parseEndTag('', tagName);
            }
            unary = empty[tagName] || !!unary;
            handler.start(tagName, unary, lineNo);
            if (!unary) {
                stack.push(tagName);
            }
            HTMLParser.parseAttrs(rest, handler, lineNo);
            handler.end(tagName, unary, lineNo);
            if (tagName === 'html') {
                skipChars = true;
            }
        }
        function parseEndTag(tag, tagName) {
            var pos;
            if (!tagName) {
                pos = 0;
            } else {
                tagName = caseMattersElements[tagName] ? tagName : tagName.toLowerCase();
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[pos] === tagName) {
                        break;
                    }
                }
            }
            if (pos >= 0) {
                for (var i = stack.length - 1; i >= pos; i--) {
                    if (handler.close) {
                        handler.close(stack[i], lineNo);
                    }
                }
                stack.length = pos;
                if (tagName === 'body') {
                    skipChars = true;
                }
            }
        }
        function parseMustache(mustache, inside) {
            if (handler.special) {
                handler.special(inside, lineNo);
            }
        }
        var callChars = function () {
            if (charsText && !skipChars) {
                if (handler.chars) {
                    handler.chars(charsText, lineNo);
                }
            }
            skipChars = false;
            charsText = '';
        };
        var index, chars, skipChars, match, lineNo, stack = [], last = html, charsText = '';
        stack.last = function () {
            return this[this.length - 1];
        };
        while (html) {
            chars = true;
            if (!stack.last() || !special[stack.last()]) {
                if (html.indexOf('<!--') === 0) {
                    index = html.indexOf('-->');
                    if (index >= 0) {
                        callChars();
                        if (handler.comment) {
                            handler.comment(html.substring(4, index), lineNo);
                        }
                        html = html.substring(index + 3);
                        chars = false;
                    }
                } else if (html.indexOf('</') === 0) {
                    match = html.match(endTag);
                    if (match) {
                        callChars();
                        match[0].replace(endTag, parseEndTag);
                        html = html.substring(match[0].length);
                        chars = false;
                    }
                } else if (html.indexOf('<') === 0) {
                    var res = HTMLParser.searchStartTag(html);
                    if (res) {
                        callChars();
                        parseStartTag.apply(null, res.match);
                        html = res.html;
                        chars = false;
                    }
                } else if (html.indexOf(magicStart) === 0) {
                    match = html.match(magicMatch);
                    if (match) {
                        callChars();
                        match[0].replace(magicMatch, parseMustache);
                        html = html.substring(match[0].length);
                    }
                }
                if (chars) {
                    index = findBreak(html, magicStart);
                    if (index === 0 && html === last) {
                        charsText += html.charAt(0);
                        html = html.substr(1);
                        index = findBreak(html, magicStart);
                    }
                    var text = index < 0 ? html : html.substring(0, index);
                    html = index < 0 ? '' : html.substring(index);
                    if (text) {
                        charsText += text;
                    }
                }
            } else {
                html = html.replace(new RegExp('([\\s\\S]*?)</' + stack.last() + '[^>]*>'), function (all, text) {
                    text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, '$1$2');
                    if (handler.chars) {
                        handler.chars(text, lineNo);
                    }
                    return '';
                });
                parseEndTag('', stack.last());
            }
            if (html === last) {
                throw new Error('Parse Error: ' + html);
            }
            last = html;
        }
        callChars();
        parseEndTag();
        handler.done(lineNo);
        return intermediate;
    };
    var callAttrStart = function (state, curIndex, handler, rest, lineNo) {
        var attrName = rest.substring(typeof state.nameStart === 'number' ? state.nameStart : curIndex, curIndex), newAttrName = encoder.encode(attrName);
        state.attrStart = newAttrName;
        handler.attrStart(state.attrStart, lineNo);
        state.inName = false;
    };
    var callAttrEnd = function (state, curIndex, handler, rest, lineNo) {
        if (state.valueStart !== undefined && state.valueStart < curIndex) {
            var val = rest.substring(state.valueStart, curIndex);
            handler.attrValue(val, lineNo);
        }
        handler.attrEnd(state.attrStart, lineNo);
        state.attrStart = undefined;
        state.valueStart = undefined;
        state.inValue = false;
        state.inName = false;
        state.lookingForEq = false;
        state.inQuote = false;
        state.lookingForName = true;
    };
    var findBreak = function (str, magicStart) {
        var magicLength = magicStart.length;
        for (var i = 0, len = str.length; i < len; i++) {
            if (str[i] === '<' || str.substr(i, magicLength) === magicStart) {
                return i;
            }
        }
        return -1;
    };
    HTMLParser.parseAttrs = function (rest, handler, lineNo) {
        if (!rest) {
            return;
        }
        var i = 0;
        var curIndex;
        var state = {
            inName: false,
            nameStart: undefined,
            inValue: false,
            valueStart: undefined,
            inQuote: false,
            attrStart: undefined,
            lookingForName: true,
            lookingForValue: false,
            lookingForEq: false
        };
        while (i < rest.length) {
            curIndex = i;
            var cur = rest.charAt(i);
            i++;
            if (magicStart === rest.substr(curIndex, magicStart.length)) {
                if (state.inValue && curIndex > state.valueStart) {
                    handler.attrValue(rest.substring(state.valueStart, curIndex), lineNo);
                } else if (state.inName && state.nameStart < curIndex) {
                    callAttrStart(state, curIndex, handler, rest, lineNo);
                    callAttrEnd(state, curIndex, handler, rest, lineNo);
                } else if (state.lookingForValue) {
                    state.inValue = true;
                } else if (state.lookingForEq && state.attrStart) {
                    callAttrEnd(state, curIndex, handler, rest, lineNo);
                }
                magicMatch.lastIndex = curIndex;
                var match = magicMatch.exec(rest);
                if (match) {
                    handler.special(match[1], lineNo);
                    i = curIndex + match[0].length;
                    if (state.inValue) {
                        state.valueStart = curIndex + match[0].length;
                    }
                }
            } else if (state.inValue) {
                if (state.inQuote) {
                    if (cur === state.inQuote) {
                        callAttrEnd(state, curIndex, handler, rest, lineNo);
                    }
                } else if (space.test(cur)) {
                    callAttrEnd(state, curIndex, handler, rest, lineNo);
                }
            } else if (cur === '=' && (state.lookingForEq || state.lookingForName || state.inName)) {
                if (!state.attrStart) {
                    callAttrStart(state, curIndex, handler, rest, lineNo);
                }
                state.lookingForValue = true;
                state.lookingForEq = false;
                state.lookingForName = false;
            } else if (state.inName) {
                var started = rest[state.nameStart], otherStart, otherOpposite;
                if (startOppositesMap[started] === cur) {
                    otherStart = started === '{' ? '(' : '{';
                    otherOpposite = startOppositesMap[otherStart];
                    if (rest[curIndex + 1] === otherOpposite) {
                        callAttrStart(state, curIndex + 2, handler, rest, lineNo);
                        i++;
                    } else {
                        callAttrStart(state, curIndex + 1, handler, rest, lineNo);
                    }
                    state.lookingForEq = true;
                } else if (space.test(cur) && started !== '{' && started !== '(') {
                    callAttrStart(state, curIndex, handler, rest, lineNo);
                    state.lookingForEq = true;
                }
            } else if (state.lookingForName) {
                if (!space.test(cur)) {
                    if (state.attrStart) {
                        callAttrEnd(state, curIndex, handler, rest, lineNo);
                    }
                    state.nameStart = curIndex;
                    state.inName = true;
                }
            } else if (state.lookingForValue) {
                if (!space.test(cur)) {
                    state.lookingForValue = false;
                    state.inValue = true;
                    if (cur === '\'' || cur === '"') {
                        state.inQuote = cur;
                        state.valueStart = curIndex + 1;
                    } else {
                        state.valueStart = curIndex;
                    }
                } else if (i === rest.length) {
                    callAttrEnd(state, curIndex, handler, rest, lineNo);
                }
            }
        }
        if (state.inName) {
            callAttrStart(state, curIndex + 1, handler, rest, lineNo);
            callAttrEnd(state, curIndex + 1, handler, rest, lineNo);
        } else if (state.lookingForEq || state.lookingForValue || state.inValue) {
            callAttrEnd(state, curIndex + 1, handler, rest, lineNo);
        }
        magicMatch.lastIndex = 0;
    };
    HTMLParser.searchStartTag = function (html) {
        var closingIndex = html.indexOf('>');
        var attributeRange = attributeRegexp.exec(html.substring(1));
        var afterAttributeOffset = 1;
        while (attributeRange && closingIndex >= afterAttributeOffset + attributeRange.index) {
            afterAttributeOffset += attributeRange.index + attributeRange[0].length;
            while (closingIndex < afterAttributeOffset) {
                closingIndex += html.substring(closingIndex + 1).indexOf('>') + 1;
            }
            attributeRange = attributeRegexp.exec(html.substring(afterAttributeOffset));
        }
        if (closingIndex === -1 || !alphaRegex.test(html[1])) {
            return null;
        }
        var tagName, tagContent, match, rest = '', unary = '';
        var startTag = html.substring(0, closingIndex + 1);
        var isUnary = startTag[startTag.length - 2] === '/';
        var spaceIndex = startTag.search(space);
        if (isUnary) {
            unary = '/';
            tagContent = startTag.substring(1, startTag.length - 2).trim();
        } else {
            tagContent = startTag.substring(1, startTag.length - 1).trim();
        }
        if (spaceIndex === -1) {
            tagName = tagContent;
        } else {
            spaceIndex--;
            tagName = tagContent.substring(0, spaceIndex);
            rest = tagContent.substring(spaceIndex);
        }
        match = [
            startTag,
            tagName,
            rest,
            unary
        ];
        return {
            match: match,
            html: html.substring(startTag.length)
        };
    };
    module.exports = namespace.HTMLParser = HTMLParser;
});
/*can-symbol@1.6.1#can-symbol*/
define('can-symbol@1.6.1#can-symbol', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var namespace = require('can-namespace');
        var CanSymbol;
        if (typeof Symbol !== 'undefined' && typeof Symbol.for === 'function') {
            CanSymbol = Symbol;
        } else {
            var symbolNum = 0;
            CanSymbol = function CanSymbolPolyfill(description) {
                var symbolValue = '@@symbol' + symbolNum++ + description;
                var symbol = {};
                Object.defineProperties(symbol, {
                    toString: {
                        value: function () {
                            return symbolValue;
                        }
                    }
                });
                return symbol;
            };
            var descriptionToSymbol = {};
            var symbolToDescription = {};
            CanSymbol.for = function (description) {
                var symbol = descriptionToSymbol[description];
                if (!symbol) {
                    symbol = descriptionToSymbol[description] = CanSymbol(description);
                    symbolToDescription[symbol] = description;
                }
                return symbol;
            };
            CanSymbol.keyFor = function (symbol) {
                return symbolToDescription[symbol];
            };
            [
                'hasInstance',
                'isConcatSpreadable',
                'iterator',
                'match',
                'prototype',
                'replace',
                'search',
                'species',
                'split',
                'toPrimitive',
                'toStringTag',
                'unscopables'
            ].forEach(function (name) {
                CanSymbol[name] = CanSymbol('Symbol.' + name);
            });
        }
        [
            'isMapLike',
            'isListLike',
            'isValueLike',
            'isFunctionLike',
            'getOwnKeys',
            'getOwnKeyDescriptor',
            'proto',
            'getOwnEnumerableKeys',
            'hasOwnKey',
            'hasKey',
            'size',
            'getName',
            'getIdentity',
            'assignDeep',
            'updateDeep',
            'getValue',
            'setValue',
            'getKeyValue',
            'setKeyValue',
            'updateValues',
            'addValue',
            'removeValues',
            'apply',
            'new',
            'onValue',
            'offValue',
            'onKeyValue',
            'offKeyValue',
            'getKeyDependencies',
            'getValueDependencies',
            'keyHasDependencies',
            'valueHasDependencies',
            'onKeys',
            'onKeysAdded',
            'onKeysRemoved',
            'onPatches'
        ].forEach(function (name) {
            CanSymbol.for('can.' + name);
        });
        module.exports = namespace.Symbol = CanSymbol;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-observation-recorder@1.2.0#can-observation-recorder*/
define('can-observation-recorder@1.2.0#can-observation-recorder', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var canSymbol = require('can-symbol');
    var stack = [];
    var addParentSymbol = canSymbol.for('can.addParent');
    var ObservationRecorder = {
        stack: stack,
        start: function () {
            var deps = {
                keyDependencies: new Map(),
                valueDependencies: new Set(),
                childDependencies: new Set(),
                traps: null,
                ignore: 0
            };
            stack.push(deps);
            return deps;
        },
        stop: function () {
            return stack.pop();
        },
        add: function (obj, event) {
            var top = stack[stack.length - 1];
            if (top && top.ignore === 0) {
                if (top.traps) {
                    top.traps.push([
                        obj,
                        event
                    ]);
                } else {
                    if (event === undefined) {
                        top.valueDependencies.add(obj);
                    } else {
                        var eventSet = top.keyDependencies.get(obj);
                        if (!eventSet) {
                            eventSet = new Set();
                            top.keyDependencies.set(obj, eventSet);
                        }
                        eventSet.add(event);
                    }
                }
            }
        },
        addMany: function (observes) {
            var top = stack[stack.length - 1];
            if (top) {
                if (top.traps) {
                    top.traps.push.apply(top.traps, observes);
                } else {
                    for (var i = 0, len = observes.length; i < len; i++) {
                        this.add(observes[i][0], observes[i][1]);
                    }
                }
            }
        },
        created: function (obs) {
            var top = stack[stack.length - 1];
            if (top) {
                top.childDependencies.add(obs);
                if (obs[addParentSymbol]) {
                    obs[addParentSymbol](top);
                }
            }
        },
        ignore: function (fn) {
            return function () {
                if (stack.length) {
                    var top = stack[stack.length - 1];
                    top.ignore++;
                    var res = fn.apply(this, arguments);
                    top.ignore--;
                    return res;
                } else {
                    return fn.apply(this, arguments);
                }
            };
        },
        isRecording: function () {
            var len = stack.length;
            var last = len && stack[len - 1];
            return last && last.ignore === 0 && last;
        },
        makeDependenciesRecord: function () {
            return {
                traps: null,
                keyDependencies: new Map(),
                valueDependencies: new Set(),
                ignore: 0
            };
        },
        makeDependenciesRecorder: function () {
            return ObservationRecorder.makeDependenciesRecord();
        },
        trap: function () {
            if (stack.length) {
                var top = stack[stack.length - 1];
                var oldTraps = top.traps;
                var traps = top.traps = [];
                return function () {
                    top.traps = oldTraps;
                    return traps;
                };
            } else {
                return function () {
                    return [];
                };
            }
        },
        trapsCount: function () {
            if (stack.length) {
                var top = stack[stack.length - 1];
                return top.traps.length;
            } else {
                return 0;
            }
        }
    };
    if (namespace.ObservationRecorder) {
        throw new Error('You can\'t have two versions of can-observation-recorder, check your dependencies');
    } else {
        module.exports = namespace.ObservationRecorder = ObservationRecorder;
    }
});
/*can-reflect@1.17.6#reflections/helpers*/
define('can-reflect@1.17.6#reflections/helpers', [
    'require',
    'exports',
    'module',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    module.exports = {
        makeGetFirstSymbolValue: function (symbolNames) {
            var symbols = symbolNames.map(function (name) {
                return canSymbol.for(name);
            });
            var length = symbols.length;
            return function getFirstSymbol(obj) {
                var index = -1;
                while (++index < length) {
                    if (obj[symbols[index]] !== undefined) {
                        return obj[symbols[index]];
                    }
                }
            };
        },
        hasLength: function (list) {
            var type = typeof list;
            if (type === 'string' || Array.isArray(list)) {
                return true;
            }
            var length = list && (type !== 'boolean' && type !== 'number' && 'length' in list) && list.length;
            return typeof list !== 'function' && (length === 0 || typeof length === 'number' && length > 0 && length - 1 in list);
        }
    };
});
/*can-reflect@1.17.6#reflections/type/type*/
define('can-reflect@1.17.6#reflections/type/type', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../helpers'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var helpers = require('../helpers');
    var plainFunctionPrototypePropertyNames = Object.getOwnPropertyNames(function () {
    }.prototype);
    var plainFunctionPrototypeProto = Object.getPrototypeOf(function () {
    }.prototype);
    function isConstructorLike(func) {
        var value = func[canSymbol.for('can.new')];
        if (value !== undefined) {
            return value;
        }
        if (typeof func !== 'function') {
            return false;
        }
        var prototype = func.prototype;
        if (!prototype) {
            return false;
        }
        if (plainFunctionPrototypeProto !== Object.getPrototypeOf(prototype)) {
            return true;
        }
        var propertyNames = Object.getOwnPropertyNames(prototype);
        if (propertyNames.length === plainFunctionPrototypePropertyNames.length) {
            for (var i = 0, len = propertyNames.length; i < len; i++) {
                if (propertyNames[i] !== plainFunctionPrototypePropertyNames[i]) {
                    return true;
                }
            }
            return false;
        } else {
            return true;
        }
    }
    var getNewOrApply = helpers.makeGetFirstSymbolValue([
        'can.new',
        'can.apply'
    ]);
    function isFunctionLike(obj) {
        var result, symbolValue = !!obj && obj[canSymbol.for('can.isFunctionLike')];
        if (symbolValue !== undefined) {
            return symbolValue;
        }
        result = getNewOrApply(obj);
        if (result !== undefined) {
            return !!result;
        }
        return typeof obj === 'function';
    }
    function isPrimitive(obj) {
        var type = typeof obj;
        if (obj == null || type !== 'function' && type !== 'object') {
            return true;
        } else {
            return false;
        }
    }
    var coreHasOwn = Object.prototype.hasOwnProperty;
    var funcToString = Function.prototype.toString;
    var objectCtorString = funcToString.call(Object);
    function isPlainObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        var proto = Object.getPrototypeOf(obj);
        if (proto === Object.prototype || proto === null) {
            return true;
        }
        var Constructor = coreHasOwn.call(proto, 'constructor') && proto.constructor;
        return typeof Constructor === 'function' && Constructor instanceof Constructor && funcToString.call(Constructor) === objectCtorString;
    }
    function isBuiltIn(obj) {
        if (isPrimitive(obj) || Array.isArray(obj) || isPlainObject(obj) || Object.prototype.toString.call(obj) !== '[object Object]' && Object.prototype.toString.call(obj).indexOf('[object ') !== -1) {
            return true;
        } else {
            return false;
        }
    }
    function isValueLike(obj) {
        var symbolValue;
        if (isPrimitive(obj)) {
            return true;
        }
        symbolValue = obj[canSymbol.for('can.isValueLike')];
        if (typeof symbolValue !== 'undefined') {
            return symbolValue;
        }
        var value = obj[canSymbol.for('can.getValue')];
        if (value !== undefined) {
            return !!value;
        }
    }
    function isMapLike(obj) {
        if (isPrimitive(obj)) {
            return false;
        }
        var isMapLike = obj[canSymbol.for('can.isMapLike')];
        if (typeof isMapLike !== 'undefined') {
            return !!isMapLike;
        }
        var value = obj[canSymbol.for('can.getKeyValue')];
        if (value !== undefined) {
            return !!value;
        }
        return true;
    }
    var onValueSymbol = canSymbol.for('can.onValue'), onKeyValueSymbol = canSymbol.for('can.onKeyValue'), onPatchesSymbol = canSymbol.for('can.onPatches');
    function isObservableLike(obj) {
        if (isPrimitive(obj)) {
            return false;
        }
        return Boolean(obj[onValueSymbol] || obj[onKeyValueSymbol] || obj[onPatchesSymbol]);
    }
    function isListLike(list) {
        var symbolValue, type = typeof list;
        if (type === 'string') {
            return true;
        }
        if (isPrimitive(list)) {
            return false;
        }
        symbolValue = list[canSymbol.for('can.isListLike')];
        if (typeof symbolValue !== 'undefined') {
            return symbolValue;
        }
        var value = list[canSymbol.iterator];
        if (value !== undefined) {
            return !!value;
        }
        if (Array.isArray(list)) {
            return true;
        }
        return helpers.hasLength(list);
    }
    var supportsSymbols = typeof Symbol !== 'undefined' && typeof Symbol.for === 'function';
    var isSymbolLike;
    if (supportsSymbols) {
        isSymbolLike = function (symbol) {
            return typeof symbol === 'symbol';
        };
    } else {
        var symbolStart = '@@symbol';
        isSymbolLike = function (symbol) {
            if (typeof symbol === 'object' && !Array.isArray(symbol)) {
                return symbol.toString().substr(0, symbolStart.length) === symbolStart;
            } else {
                return false;
            }
        };
    }
    module.exports = {
        isConstructorLike: isConstructorLike,
        isFunctionLike: isFunctionLike,
        isListLike: isListLike,
        isMapLike: isMapLike,
        isObservableLike: isObservableLike,
        isPrimitive: isPrimitive,
        isBuiltIn: isBuiltIn,
        isValueLike: isValueLike,
        isSymbolLike: isSymbolLike,
        isMoreListLikeThanMapLike: function (obj) {
            if (Array.isArray(obj)) {
                return true;
            }
            if (obj instanceof Array) {
                return true;
            }
            if (obj == null) {
                return false;
            }
            var value = obj[canSymbol.for('can.isMoreListLikeThanMapLike')];
            if (value !== undefined) {
                return value;
            }
            var isListLike = this.isListLike(obj), isMapLike = this.isMapLike(obj);
            if (isListLike && !isMapLike) {
                return true;
            } else if (!isListLike && isMapLike) {
                return false;
            }
        },
        isIteratorLike: function (obj) {
            return obj && typeof obj === 'object' && typeof obj.next === 'function' && obj.next.length === 0;
        },
        isPromise: function (obj) {
            return obj instanceof Promise || Object.prototype.toString.call(obj) === '[object Promise]';
        },
        isPlainObject: isPlainObject
    };
});
/*can-reflect@1.17.6#reflections/call/call*/
define('can-reflect@1.17.6#reflections/call/call', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../type/type'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var typeReflections = require('../type/type');
    module.exports = {
        call: function (func, context) {
            var args = [].slice.call(arguments, 2);
            var apply = func[canSymbol.for('can.apply')];
            if (apply) {
                return apply.call(func, context, args);
            } else {
                return func.apply(context, args);
            }
        },
        apply: function (func, context, args) {
            var apply = func[canSymbol.for('can.apply')];
            if (apply) {
                return apply.call(func, context, args);
            } else {
                return func.apply(context, args);
            }
        },
        'new': function (func) {
            var args = [].slice.call(arguments, 1);
            var makeNew = func[canSymbol.for('can.new')];
            if (makeNew) {
                return makeNew.apply(func, args);
            } else {
                var context = Object.create(func.prototype);
                var ret = func.apply(context, args);
                if (typeReflections.isPrimitive(ret)) {
                    return context;
                } else {
                    return ret;
                }
            }
        }
    };
});
/*can-reflect@1.17.6#reflections/get-set/get-set*/
define('can-reflect@1.17.6#reflections/get-set/get-set', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../type/type'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var typeReflections = require('../type/type');
    var setKeyValueSymbol = canSymbol.for('can.setKeyValue'), getKeyValueSymbol = canSymbol.for('can.getKeyValue'), getValueSymbol = canSymbol.for('can.getValue'), setValueSymbol = canSymbol.for('can.setValue');
    var reflections = {
        setKeyValue: function (obj, key, value) {
            if (typeReflections.isSymbolLike(key)) {
                if (typeof key === 'symbol') {
                    obj[key] = value;
                } else {
                    Object.defineProperty(obj, key, {
                        enumerable: false,
                        configurable: true,
                        value: value,
                        writable: true
                    });
                }
                return;
            }
            var setKeyValue = obj[setKeyValueSymbol];
            if (setKeyValue !== undefined) {
                return setKeyValue.call(obj, key, value);
            } else {
                obj[key] = value;
            }
        },
        getKeyValue: function (obj, key) {
            var getKeyValue = obj[getKeyValueSymbol];
            if (getKeyValue) {
                return getKeyValue.call(obj, key);
            }
            return obj[key];
        },
        deleteKeyValue: function (obj, key) {
            var deleteKeyValue = obj[canSymbol.for('can.deleteKeyValue')];
            if (deleteKeyValue) {
                return deleteKeyValue.call(obj, key);
            }
            delete obj[key];
        },
        getValue: function (value) {
            if (typeReflections.isPrimitive(value)) {
                return value;
            }
            var getValue = value[getValueSymbol];
            if (getValue) {
                return getValue.call(value);
            }
            return value;
        },
        setValue: function (item, value) {
            var setValue = item && item[setValueSymbol];
            if (setValue) {
                return setValue.call(item, value);
            } else {
                throw new Error('can-reflect.setValue - Can not set value.');
            }
        },
        splice: function (obj, index, removing, adding) {
            var howMany;
            if (typeof removing !== 'number') {
                var updateValues = obj[canSymbol.for('can.updateValues')];
                if (updateValues) {
                    return updateValues.call(obj, index, removing, adding);
                }
                howMany = removing.length;
            } else {
                howMany = removing;
            }
            if (arguments.length <= 3) {
                adding = [];
            }
            var splice = obj[canSymbol.for('can.splice')];
            if (splice) {
                return splice.call(obj, index, howMany, adding);
            }
            return [].splice.apply(obj, [
                index,
                howMany
            ].concat(adding));
        },
        addValues: function (obj, adding, index) {
            var add = obj[canSymbol.for('can.addValues')];
            if (add) {
                return add.call(obj, adding, index);
            }
            if (Array.isArray(obj) && index === undefined) {
                return obj.push.apply(obj, adding);
            }
            return reflections.splice(obj, index, [], adding);
        },
        removeValues: function (obj, removing, index) {
            var removeValues = obj[canSymbol.for('can.removeValues')];
            if (removeValues) {
                return removeValues.call(obj, removing, index);
            }
            if (Array.isArray(obj) && index === undefined) {
                removing.forEach(function (item) {
                    var index = obj.indexOf(item);
                    if (index >= 0) {
                        obj.splice(index, 1);
                    }
                });
                return;
            }
            return reflections.splice(obj, index, removing, []);
        }
    };
    reflections.get = reflections.getKeyValue;
    reflections.set = reflections.setKeyValue;
    reflections['delete'] = reflections.deleteKeyValue;
    module.exports = reflections;
});
/*can-reflect@1.17.6#reflections/observe/observe*/
define('can-reflect@1.17.6#reflections/observe/observe', [
    'require',
    'exports',
    'module',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var slice = [].slice;
    function makeFallback(symbolName, fallbackName) {
        return function (obj, event, handler, queueName) {
            var method = obj[canSymbol.for(symbolName)];
            if (method !== undefined) {
                return method.call(obj, event, handler, queueName);
            }
            return this[fallbackName].apply(this, arguments);
        };
    }
    function makeErrorIfMissing(symbolName, errorMessage) {
        return function (obj) {
            var method = obj[canSymbol.for(symbolName)];
            if (method !== undefined) {
                var args = slice.call(arguments, 1);
                return method.apply(obj, args);
            }
            throw new Error(errorMessage);
        };
    }
    module.exports = {
        onKeyValue: makeFallback('can.onKeyValue', 'onEvent'),
        offKeyValue: makeFallback('can.offKeyValue', 'offEvent'),
        onKeys: makeErrorIfMissing('can.onKeys', 'can-reflect: can not observe an onKeys event'),
        onKeysAdded: makeErrorIfMissing('can.onKeysAdded', 'can-reflect: can not observe an onKeysAdded event'),
        onKeysRemoved: makeErrorIfMissing('can.onKeysRemoved', 'can-reflect: can not unobserve an onKeysRemoved event'),
        getKeyDependencies: makeErrorIfMissing('can.getKeyDependencies', 'can-reflect: can not determine dependencies'),
        getWhatIChange: makeErrorIfMissing('can.getWhatIChange', 'can-reflect: can not determine dependencies'),
        getChangesDependencyRecord: function getChangesDependencyRecord(handler) {
            var fn = handler[canSymbol.for('can.getChangesDependencyRecord')];
            if (typeof fn === 'function') {
                return fn();
            }
        },
        keyHasDependencies: makeErrorIfMissing('can.keyHasDependencies', 'can-reflect: can not determine if this has key dependencies'),
        onValue: makeErrorIfMissing('can.onValue', 'can-reflect: can not observe value change'),
        offValue: makeErrorIfMissing('can.offValue', 'can-reflect: can not unobserve value change'),
        getValueDependencies: makeErrorIfMissing('can.getValueDependencies', 'can-reflect: can not determine dependencies'),
        valueHasDependencies: makeErrorIfMissing('can.valueHasDependencies', 'can-reflect: can not determine if value has dependencies'),
        onPatches: makeErrorIfMissing('can.onPatches', 'can-reflect: can not observe patches on object'),
        offPatches: makeErrorIfMissing('can.offPatches', 'can-reflect: can not unobserve patches on object'),
        onInstancePatches: makeErrorIfMissing('can.onInstancePatches', 'can-reflect: can not observe onInstancePatches on Type'),
        offInstancePatches: makeErrorIfMissing('can.offInstancePatches', 'can-reflect: can not unobserve onInstancePatches on Type'),
        onInstanceBoundChange: makeErrorIfMissing('can.onInstanceBoundChange', 'can-reflect: can not observe bound state change in instances.'),
        offInstanceBoundChange: makeErrorIfMissing('can.offInstanceBoundChange', 'can-reflect: can not unobserve bound state change'),
        isBound: makeErrorIfMissing('can.isBound', 'can-reflect: cannot determine if object is bound'),
        onEvent: function (obj, eventName, callback, queue) {
            if (obj) {
                var onEvent = obj[canSymbol.for('can.onEvent')];
                if (onEvent !== undefined) {
                    return onEvent.call(obj, eventName, callback, queue);
                } else if (obj.addEventListener) {
                    obj.addEventListener(eventName, callback, queue);
                }
            }
        },
        offEvent: function (obj, eventName, callback, queue) {
            if (obj) {
                var offEvent = obj[canSymbol.for('can.offEvent')];
                if (offEvent !== undefined) {
                    return offEvent.call(obj, eventName, callback, queue);
                } else if (obj.removeEventListener) {
                    obj.removeEventListener(eventName, callback, queue);
                }
            }
        },
        setPriority: function (obj, priority) {
            if (obj) {
                var setPriority = obj[canSymbol.for('can.setPriority')];
                if (setPriority !== undefined) {
                    setPriority.call(obj, priority);
                    return true;
                }
            }
            return false;
        },
        getPriority: function (obj) {
            if (obj) {
                var getPriority = obj[canSymbol.for('can.getPriority')];
                if (getPriority !== undefined) {
                    return getPriority.call(obj);
                }
            }
            return undefined;
        }
    };
});
/*can-reflect@1.17.6#reflections/shape/shape*/
define('can-reflect@1.17.6#reflections/shape/shape', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../get-set/get-set',
    '../type/type',
    '../helpers'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var getSetReflections = require('../get-set/get-set');
    var typeReflections = require('../type/type');
    var helpers = require('../helpers');
    var getPrototypeOfWorksWithPrimitives = true;
    try {
        Object.getPrototypeOf(1);
    } catch (e) {
        getPrototypeOfWorksWithPrimitives = false;
    }
    var ArrayMap;
    if (typeof Map === 'function') {
        ArrayMap = Map;
    } else {
        var isEven = function isEven(num) {
            return num % 2 === 0;
        };
        ArrayMap = function () {
            this.contents = [];
        };
        ArrayMap.prototype = {
            _getIndex: function (key) {
                var idx;
                do {
                    idx = this.contents.indexOf(key, idx);
                } while (idx !== -1 && !isEven(idx));
                return idx;
            },
            has: function (key) {
                return this._getIndex(key) !== -1;
            },
            get: function (key) {
                var idx = this._getIndex(key);
                if (idx !== -1) {
                    return this.contents[idx + 1];
                }
            },
            set: function (key, value) {
                var idx = this._getIndex(key);
                if (idx !== -1) {
                    this.contents[idx + 1] = value;
                } else {
                    this.contents.push(key);
                    this.contents.push(value);
                }
            },
            'delete': function (key) {
                var idx = this._getIndex(key);
                if (idx !== -1) {
                    this.contents.splice(idx, 2);
                }
            }
        };
    }
    var shapeReflections;
    var shiftFirstArgumentToThis = function (func) {
        return function () {
            var args = [this];
            args.push.apply(args, arguments);
            return func.apply(null, args);
        };
    };
    var getKeyValueSymbol = canSymbol.for('can.getKeyValue');
    var shiftedGetKeyValue = shiftFirstArgumentToThis(getSetReflections.getKeyValue);
    var setKeyValueSymbol = canSymbol.for('can.setKeyValue');
    var shiftedSetKeyValue = shiftFirstArgumentToThis(getSetReflections.setKeyValue);
    var sizeSymbol = canSymbol.for('can.size');
    var hasUpdateSymbol = helpers.makeGetFirstSymbolValue([
        'can.updateDeep',
        'can.assignDeep',
        'can.setKeyValue'
    ]);
    var shouldUpdateOrAssign = function (obj) {
        return typeReflections.isPlainObject(obj) || Array.isArray(obj) || !!hasUpdateSymbol(obj);
    };
    function isSerializedHelper(obj) {
        if (typeReflections.isPrimitive(obj)) {
            return true;
        }
        if (hasUpdateSymbol(obj)) {
            return false;
        }
        return typeReflections.isBuiltIn(obj) && !typeReflections.isPlainObject(obj) && !Array.isArray(obj);
    }
    var Object_Keys;
    try {
        Object.keys(1);
        Object_Keys = Object.keys;
    } catch (e) {
        Object_Keys = function (obj) {
            if (typeReflections.isPrimitive(obj)) {
                return [];
            } else {
                return Object.keys(obj);
            }
        };
    }
    function createSerializeMap(Type) {
        var MapType = Type || ArrayMap;
        return {
            unwrap: new MapType(),
            serialize: new MapType(),
            isSerializing: {
                unwrap: new MapType(),
                serialize: new MapType()
            },
            circularReferenceIsSerializing: {
                unwrap: new MapType(),
                serialize: new MapType()
            }
        };
    }
    function makeSerializer(methodName, symbolsToCheck) {
        var serializeMap = null;
        function SerializeOperation(MapType) {
            this.first = !serializeMap;
            if (this.first) {
                serializeMap = createSerializeMap(MapType);
            }
            this.map = serializeMap;
            this.result = null;
        }
        SerializeOperation.prototype.end = function () {
            if (this.first) {
                serializeMap = null;
            }
            return this.result;
        };
        return function serializer(value, MapType) {
            if (isSerializedHelper(value)) {
                return value;
            }
            var operation = new SerializeOperation(MapType);
            if (typeReflections.isValueLike(value)) {
                operation.result = this[methodName](getSetReflections.getValue(value));
            } else {
                var isListLike = typeReflections.isIteratorLike(value) || typeReflections.isMoreListLikeThanMapLike(value);
                operation.result = isListLike ? [] : {};
                if (operation.map[methodName].has(value)) {
                    if (operation.map.isSerializing[methodName].has(value)) {
                        operation.map.circularReferenceIsSerializing[methodName].set(value, true);
                    }
                    return operation.map[methodName].get(value);
                } else {
                    operation.map[methodName].set(value, operation.result);
                }
                for (var i = 0, len = symbolsToCheck.length; i < len; i++) {
                    var serializer = value[symbolsToCheck[i]];
                    if (serializer) {
                        operation.map.isSerializing[methodName].set(value, true);
                        var oldResult = operation.result;
                        operation.result = serializer.call(value, oldResult);
                        operation.map.isSerializing[methodName].delete(value);
                        if (operation.result !== oldResult) {
                            if (operation.map.circularReferenceIsSerializing[methodName].has(value)) {
                                operation.end();
                                throw new Error('Cannot serialize cirular reference!');
                            }
                            operation.map[methodName].set(value, operation.result);
                        }
                        return operation.end();
                    }
                }
                if (typeof obj === 'function') {
                    operation.map[methodName].set(value, value);
                    operation.result = value;
                } else if (isListLike) {
                    this.eachIndex(value, function (childValue, index) {
                        operation.result[index] = this[methodName](childValue);
                    }, this);
                } else {
                    this.eachKey(value, function (childValue, prop) {
                        operation.result[prop] = this[methodName](childValue);
                    }, this);
                }
            }
            return operation.end();
        };
    }
    var makeMap;
    if (typeof Map !== 'undefined') {
        makeMap = function (keys) {
            var map = new Map();
            shapeReflections.eachIndex(keys, function (key) {
                map.set(key, true);
            });
            return map;
        };
    } else {
        makeMap = function (keys) {
            var map = {};
            keys.forEach(function (key) {
                map[key] = true;
            });
            return {
                get: function (key) {
                    return map[key];
                },
                set: function (key, value) {
                    map[key] = value;
                },
                keys: function () {
                    return keys;
                }
            };
        };
    }
    var fastHasOwnKey = function (obj) {
        var hasOwnKey = obj[canSymbol.for('can.hasOwnKey')];
        if (hasOwnKey) {
            return hasOwnKey.bind(obj);
        } else {
            var map = makeMap(shapeReflections.getOwnEnumerableKeys(obj));
            return function (key) {
                return map.get(key);
            };
        }
    };
    function addPatch(patches, patch) {
        var lastPatch = patches[patches.length - 1];
        if (lastPatch) {
            if (lastPatch.deleteCount === lastPatch.insert.length && patch.index - lastPatch.index === lastPatch.deleteCount) {
                lastPatch.insert.push.apply(lastPatch.insert, patch.insert);
                lastPatch.deleteCount += patch.deleteCount;
                return;
            }
        }
        patches.push(patch);
    }
    function updateDeepList(target, source, isAssign) {
        var sourceArray = this.toArray(source);
        var patches = [], lastIndex = -1;
        this.eachIndex(target, function (curVal, index) {
            lastIndex = index;
            if (index >= sourceArray.length) {
                if (!isAssign) {
                    addPatch(patches, {
                        index: index,
                        deleteCount: target.length - index + 1,
                        insert: []
                    });
                }
                return false;
            }
            var newVal = sourceArray[index];
            if (typeReflections.isPrimitive(curVal) || typeReflections.isPrimitive(newVal) || shouldUpdateOrAssign(curVal) === false) {
                addPatch(patches, {
                    index: index,
                    deleteCount: 1,
                    insert: [newVal]
                });
            } else {
                if (isAssign === true) {
                    this.assignDeep(curVal, newVal);
                } else {
                    this.updateDeep(curVal, newVal);
                }
            }
        }, this);
        if (sourceArray.length > lastIndex) {
            addPatch(patches, {
                index: lastIndex + 1,
                deleteCount: 0,
                insert: sourceArray.slice(lastIndex + 1)
            });
        }
        for (var i = 0, patchLen = patches.length; i < patchLen; i++) {
            var patch = patches[i];
            getSetReflections.splice(target, patch.index, patch.deleteCount, patch.insert);
        }
        return target;
    }
    shapeReflections = {
        each: function (obj, callback, context) {
            if (typeReflections.isIteratorLike(obj) || typeReflections.isMoreListLikeThanMapLike(obj)) {
                return shapeReflections.eachIndex(obj, callback, context);
            } else {
                return shapeReflections.eachKey(obj, callback, context);
            }
        },
        eachIndex: function (list, callback, context) {
            if (Array.isArray(list)) {
                return shapeReflections.eachListLike(list, callback, context);
            } else {
                var iter, iterator = list[canSymbol.iterator];
                if (typeReflections.isIteratorLike(list)) {
                    iter = list;
                } else if (iterator) {
                    iter = iterator.call(list);
                }
                if (iter) {
                    var res, index = 0;
                    while (!(res = iter.next()).done) {
                        if (callback.call(context || list, res.value, index++, list) === false) {
                            break;
                        }
                    }
                } else {
                    shapeReflections.eachListLike(list, callback, context);
                }
            }
            return list;
        },
        eachListLike: function (list, callback, context) {
            var index = -1;
            var length = list.length;
            if (length === undefined) {
                var size = list[sizeSymbol];
                if (size) {
                    length = size.call(list);
                } else {
                    throw new Error('can-reflect: unable to iterate.');
                }
            }
            while (++index < length) {
                var item = list[index];
                if (callback.call(context || item, item, index, list) === false) {
                    break;
                }
            }
            return list;
        },
        toArray: function (obj) {
            var arr = [];
            shapeReflections.each(obj, function (value) {
                arr.push(value);
            });
            return arr;
        },
        eachKey: function (obj, callback, context) {
            if (obj) {
                var enumerableKeys = shapeReflections.getOwnEnumerableKeys(obj);
                var getKeyValue = obj[getKeyValueSymbol] || shiftedGetKeyValue;
                return shapeReflections.eachIndex(enumerableKeys, function (key) {
                    var value = getKeyValue.call(obj, key);
                    return callback.call(context || obj, value, key, obj);
                });
            }
            return obj;
        },
        'hasOwnKey': function (obj, key) {
            var hasOwnKey = obj[canSymbol.for('can.hasOwnKey')];
            if (hasOwnKey) {
                return hasOwnKey.call(obj, key);
            }
            var getOwnKeys = obj[canSymbol.for('can.getOwnKeys')];
            if (getOwnKeys) {
                var found = false;
                shapeReflections.eachIndex(getOwnKeys.call(obj), function (objKey) {
                    if (objKey === key) {
                        found = true;
                        return false;
                    }
                });
                return found;
            }
            return obj.hasOwnProperty(key);
        },
        getOwnEnumerableKeys: function (obj) {
            var getOwnEnumerableKeys = obj[canSymbol.for('can.getOwnEnumerableKeys')];
            if (getOwnEnumerableKeys) {
                return getOwnEnumerableKeys.call(obj);
            }
            if (obj[canSymbol.for('can.getOwnKeys')] && obj[canSymbol.for('can.getOwnKeyDescriptor')]) {
                var keys = [];
                shapeReflections.eachIndex(shapeReflections.getOwnKeys(obj), function (key) {
                    var descriptor = shapeReflections.getOwnKeyDescriptor(obj, key);
                    if (descriptor.enumerable) {
                        keys.push(key);
                    }
                }, this);
                return keys;
            } else {
                return Object_Keys(obj);
            }
        },
        getOwnKeys: function (obj) {
            var getOwnKeys = obj[canSymbol.for('can.getOwnKeys')];
            if (getOwnKeys) {
                return getOwnKeys.call(obj);
            } else {
                return Object.getOwnPropertyNames(obj);
            }
        },
        getOwnKeyDescriptor: function (obj, key) {
            var getOwnKeyDescriptor = obj[canSymbol.for('can.getOwnKeyDescriptor')];
            if (getOwnKeyDescriptor) {
                return getOwnKeyDescriptor.call(obj, key);
            } else {
                return Object.getOwnPropertyDescriptor(obj, key);
            }
        },
        unwrap: makeSerializer('unwrap', [canSymbol.for('can.unwrap')]),
        serialize: makeSerializer('serialize', [
            canSymbol.for('can.serialize'),
            canSymbol.for('can.unwrap')
        ]),
        assignMap: function (target, source) {
            var hasOwnKey = fastHasOwnKey(target);
            var getKeyValue = target[getKeyValueSymbol] || shiftedGetKeyValue;
            var setKeyValue = target[setKeyValueSymbol] || shiftedSetKeyValue;
            shapeReflections.eachKey(source, function (value, key) {
                if (!hasOwnKey(key) || getKeyValue.call(target, key) !== value) {
                    setKeyValue.call(target, key, value);
                }
            });
            return target;
        },
        assignList: function (target, source) {
            var inserting = shapeReflections.toArray(source);
            getSetReflections.splice(target, 0, inserting, inserting);
            return target;
        },
        assign: function (target, source) {
            if (typeReflections.isIteratorLike(source) || typeReflections.isMoreListLikeThanMapLike(source)) {
                shapeReflections.assignList(target, source);
            } else {
                shapeReflections.assignMap(target, source);
            }
            return target;
        },
        assignDeepMap: function (target, source) {
            var hasOwnKey = fastHasOwnKey(target);
            var getKeyValue = target[getKeyValueSymbol] || shiftedGetKeyValue;
            var setKeyValue = target[setKeyValueSymbol] || shiftedSetKeyValue;
            shapeReflections.eachKey(source, function (newVal, key) {
                if (!hasOwnKey(key)) {
                    getSetReflections.setKeyValue(target, key, newVal);
                } else {
                    var curVal = getKeyValue.call(target, key);
                    if (newVal === curVal) {
                    } else if (typeReflections.isPrimitive(curVal) || typeReflections.isPrimitive(newVal) || shouldUpdateOrAssign(curVal) === false) {
                        setKeyValue.call(target, key, newVal);
                    } else {
                        shapeReflections.assignDeep(curVal, newVal);
                    }
                }
            }, this);
            return target;
        },
        assignDeepList: function (target, source) {
            return updateDeepList.call(this, target, source, true);
        },
        assignDeep: function (target, source) {
            var assignDeep = target[canSymbol.for('can.assignDeep')];
            if (assignDeep) {
                assignDeep.call(target, source);
            } else if (typeReflections.isMoreListLikeThanMapLike(source)) {
                shapeReflections.assignDeepList(target, source);
            } else {
                shapeReflections.assignDeepMap(target, source);
            }
            return target;
        },
        updateMap: function (target, source) {
            var sourceKeyMap = makeMap(shapeReflections.getOwnEnumerableKeys(source));
            var sourceGetKeyValue = source[getKeyValueSymbol] || shiftedGetKeyValue;
            var targetSetKeyValue = target[setKeyValueSymbol] || shiftedSetKeyValue;
            shapeReflections.eachKey(target, function (curVal, key) {
                if (!sourceKeyMap.get(key)) {
                    getSetReflections.deleteKeyValue(target, key);
                    return;
                }
                sourceKeyMap.set(key, false);
                var newVal = sourceGetKeyValue.call(source, key);
                if (newVal !== curVal) {
                    targetSetKeyValue.call(target, key, newVal);
                }
            }, this);
            shapeReflections.eachIndex(sourceKeyMap.keys(), function (key) {
                if (sourceKeyMap.get(key)) {
                    targetSetKeyValue.call(target, key, sourceGetKeyValue.call(source, key));
                }
            });
            return target;
        },
        updateList: function (target, source) {
            var inserting = shapeReflections.toArray(source);
            getSetReflections.splice(target, 0, target, inserting);
            return target;
        },
        update: function (target, source) {
            if (typeReflections.isIteratorLike(source) || typeReflections.isMoreListLikeThanMapLike(source)) {
                shapeReflections.updateList(target, source);
            } else {
                shapeReflections.updateMap(target, source);
            }
            return target;
        },
        updateDeepMap: function (target, source) {
            var sourceKeyMap = makeMap(shapeReflections.getOwnEnumerableKeys(source));
            var sourceGetKeyValue = source[getKeyValueSymbol] || shiftedGetKeyValue;
            var targetSetKeyValue = target[setKeyValueSymbol] || shiftedSetKeyValue;
            shapeReflections.eachKey(target, function (curVal, key) {
                if (!sourceKeyMap.get(key)) {
                    getSetReflections.deleteKeyValue(target, key);
                    return;
                }
                sourceKeyMap.set(key, false);
                var newVal = sourceGetKeyValue.call(source, key);
                if (typeReflections.isPrimitive(curVal) || typeReflections.isPrimitive(newVal) || shouldUpdateOrAssign(curVal) === false) {
                    targetSetKeyValue.call(target, key, newVal);
                } else {
                    shapeReflections.updateDeep(curVal, newVal);
                }
            }, this);
            shapeReflections.eachIndex(sourceKeyMap.keys(), function (key) {
                if (sourceKeyMap.get(key)) {
                    targetSetKeyValue.call(target, key, sourceGetKeyValue.call(source, key));
                }
            });
            return target;
        },
        updateDeepList: function (target, source) {
            return updateDeepList.call(this, target, source);
        },
        updateDeep: function (target, source) {
            var updateDeep = target[canSymbol.for('can.updateDeep')];
            if (updateDeep) {
                updateDeep.call(target, source);
            } else if (typeReflections.isMoreListLikeThanMapLike(source)) {
                shapeReflections.updateDeepList(target, source);
            } else {
                shapeReflections.updateDeepMap(target, source);
            }
            return target;
        },
        hasKey: function (obj, key) {
            if (obj == null) {
                return false;
            }
            if (typeReflections.isPrimitive(obj)) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    return true;
                } else {
                    var proto;
                    if (getPrototypeOfWorksWithPrimitives) {
                        proto = Object.getPrototypeOf(obj);
                    } else {
                        proto = obj.__proto__;
                    }
                    if (proto !== undefined) {
                        return key in proto;
                    } else {
                        return obj[key] !== undefined;
                    }
                }
            }
            var hasKey = obj[canSymbol.for('can.hasKey')];
            if (hasKey) {
                return hasKey.call(obj, key);
            }
            var found = shapeReflections.hasOwnKey(obj, key);
            return found || key in obj;
        },
        getAllEnumerableKeys: function () {
        },
        getAllKeys: function () {
        },
        assignSymbols: function (target, source) {
            shapeReflections.eachKey(source, function (value, key) {
                var symbol = typeReflections.isSymbolLike(canSymbol[key]) ? canSymbol[key] : canSymbol.for(key);
                getSetReflections.setKeyValue(target, symbol, value);
            });
            return target;
        },
        isSerialized: isSerializedHelper,
        size: function (obj) {
            if (obj == null) {
                return 0;
            }
            var size = obj[sizeSymbol];
            var count = 0;
            if (size) {
                return size.call(obj);
            } else if (helpers.hasLength(obj)) {
                return obj.length;
            } else if (typeReflections.isListLike(obj)) {
                shapeReflections.eachIndex(obj, function () {
                    count++;
                });
                return count;
            } else if (obj) {
                return shapeReflections.getOwnEnumerableKeys(obj).length;
            } else {
                return undefined;
            }
        },
        defineInstanceKey: function (cls, key, properties) {
            var defineInstanceKey = cls[canSymbol.for('can.defineInstanceKey')];
            if (defineInstanceKey) {
                return defineInstanceKey.call(cls, key, properties);
            }
            var proto = cls.prototype;
            defineInstanceKey = proto[canSymbol.for('can.defineInstanceKey')];
            if (defineInstanceKey) {
                defineInstanceKey.call(proto, key, properties);
            } else {
                Object.defineProperty(proto, key, shapeReflections.assign({
                    configurable: true,
                    enumerable: !typeReflections.isSymbolLike(key),
                    writable: true
                }, properties));
            }
        }
    };
    shapeReflections.isSerializable = shapeReflections.isSerialized;
    shapeReflections.keys = shapeReflections.getOwnEnumerableKeys;
    module.exports = shapeReflections;
});
/*can-reflect@1.17.6#reflections/shape/schema/schema*/
define('can-reflect@1.17.6#reflections/shape/schema/schema', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../../type/type',
    '../../get-set/get-set',
    '../shape'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var typeReflections = require('../../type/type');
    var getSetReflections = require('../../get-set/get-set');
    var shapeReflections = require('../shape');
    var getSchemaSymbol = canSymbol.for('can.getSchema'), isMemberSymbol = canSymbol.for('can.isMember'), newSymbol = canSymbol.for('can.new');
    function comparator(a, b) {
        return a.localeCompare(b);
    }
    function sort(obj) {
        if (typeReflections.isPrimitive(obj)) {
            return obj;
        }
        var out;
        if (typeReflections.isListLike(obj)) {
            out = [];
            shapeReflections.eachKey(obj, function (item) {
                out.push(sort(item));
            });
            return out;
        }
        if (typeReflections.isMapLike(obj)) {
            out = {};
            shapeReflections.getOwnKeys(obj).sort(comparator).forEach(function (key) {
                out[key] = sort(getSetReflections.getKeyValue(obj, key));
            });
            return out;
        }
        return obj;
    }
    function isPrimitiveConverter(Type) {
        return Type === Number || Type === String || Type === Boolean;
    }
    var schemaReflections = {
        getSchema: function (type) {
            if (type === undefined) {
                return undefined;
            }
            var getSchema = type[getSchemaSymbol];
            if (getSchema === undefined) {
                type = type.constructor;
                getSchema = type && type[getSchemaSymbol];
            }
            return getSchema !== undefined ? getSchema.call(type) : undefined;
        },
        getIdentity: function (value, schema) {
            schema = schema || schemaReflections.getSchema(value);
            if (schema === undefined) {
                throw new Error('can-reflect.getIdentity - Unable to find a schema for the given value.');
            }
            var identity = schema.identity;
            if (!identity || identity.length === 0) {
                throw new Error('can-reflect.getIdentity - Provided schema lacks an identity property.');
            } else if (identity.length === 1) {
                return getSetReflections.getKeyValue(value, identity[0]);
            } else {
                var id = {};
                identity.forEach(function (key) {
                    id[key] = getSetReflections.getKeyValue(value, key);
                });
                return JSON.stringify(schemaReflections.cloneKeySort(id));
            }
        },
        cloneKeySort: function (obj) {
            return sort(obj);
        },
        convert: function (value, Type) {
            if (isPrimitiveConverter(Type)) {
                return Type(value);
            }
            var isMemberTest = Type[isMemberSymbol], isMember = false, type = typeof Type, createNew = Type[newSymbol];
            if (isMemberTest !== undefined) {
                isMember = isMemberTest.call(Type, value);
            } else if (type === 'function') {
                if (typeReflections.isConstructorLike(Type)) {
                    isMember = value instanceof Type;
                }
            }
            if (isMember) {
                return value;
            }
            if (createNew !== undefined) {
                return createNew.call(Type, value);
            } else if (type === 'function') {
                if (typeReflections.isConstructorLike(Type)) {
                    return new Type(value);
                } else {
                    return Type(value);
                }
            } else {
                throw new Error('can-reflect: Can not convert values into type. Type must provide `can.new` symbol.');
            }
        }
    };
    module.exports = schemaReflections;
});
/*can-reflect@1.17.6#reflections/get-name/get-name*/
define('can-reflect@1.17.6#reflections/get-name/get-name', [
    'require',
    'exports',
    'module',
    'can-symbol',
    '../type/type'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var typeReflections = require('../type/type');
    var getNameSymbol = canSymbol.for('can.getName');
    function setName(obj, nameGetter) {
        if (typeof nameGetter !== 'function') {
            var value = nameGetter;
            nameGetter = function () {
                return value;
            };
        }
        Object.defineProperty(obj, getNameSymbol, { value: nameGetter });
    }
    var anonymousID = 0;
    function getName(obj) {
        var type = typeof obj;
        if (obj === null || type !== 'object' && type !== 'function') {
            return '' + obj;
        }
        var nameGetter = obj[getNameSymbol];
        if (nameGetter) {
            return nameGetter.call(obj);
        }
        if (type === 'function') {
            if (!('name' in obj)) {
                obj.name = 'functionIE' + anonymousID++;
            }
            return obj.name;
        }
        if (obj.constructor && obj !== obj.constructor) {
            var parent = getName(obj.constructor);
            if (parent) {
                if (typeReflections.isValueLike(obj)) {
                    return parent + '<>';
                }
                if (typeReflections.isMoreListLikeThanMapLike(obj)) {
                    return parent + '[]';
                }
                if (typeReflections.isMapLike(obj)) {
                    return parent + '{}';
                }
            }
        }
        return undefined;
    }
    module.exports = {
        setName: setName,
        getName: getName
    };
});
/*can-reflect@1.17.6#types/map*/
define('can-reflect@1.17.6#types/map', [
    'require',
    'exports',
    'module',
    '../reflections/shape/shape',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var shape = require('../reflections/shape/shape');
    var CanSymbol = require('can-symbol');
    function keysPolyfill() {
        var keys = [];
        var currentIndex = 0;
        this.forEach(function (val, key) {
            keys.push(key);
        });
        return {
            next: function () {
                return {
                    value: keys[currentIndex],
                    done: currentIndex++ === keys.length
                };
            }
        };
    }
    if (typeof Map !== 'undefined') {
        shape.assignSymbols(Map.prototype, {
            'can.getOwnEnumerableKeys': Map.prototype.keys,
            'can.setKeyValue': Map.prototype.set,
            'can.getKeyValue': Map.prototype.get,
            'can.deleteKeyValue': Map.prototype['delete'],
            'can.hasOwnKey': Map.prototype.has
        });
        if (typeof Map.prototype.keys !== 'function') {
            Map.prototype.keys = Map.prototype[CanSymbol.for('can.getOwnEnumerableKeys')] = keysPolyfill;
        }
    }
    if (typeof WeakMap !== 'undefined') {
        shape.assignSymbols(WeakMap.prototype, {
            'can.getOwnEnumerableKeys': function () {
                throw new Error('can-reflect: WeakMaps do not have enumerable keys.');
            },
            'can.setKeyValue': WeakMap.prototype.set,
            'can.getKeyValue': WeakMap.prototype.get,
            'can.deleteKeyValue': WeakMap.prototype['delete'],
            'can.hasOwnKey': WeakMap.prototype.has
        });
    }
});
/*can-reflect@1.17.6#types/set*/
define('can-reflect@1.17.6#types/set', [
    'require',
    'exports',
    'module',
    '../reflections/shape/shape',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var shape = require('../reflections/shape/shape');
    var CanSymbol = require('can-symbol');
    if (typeof Set !== 'undefined') {
        shape.assignSymbols(Set.prototype, {
            'can.isMoreListLikeThanMapLike': true,
            'can.updateValues': function (index, removing, adding) {
                if (removing !== adding) {
                    shape.each(removing, function (value) {
                        this.delete(value);
                    }, this);
                }
                shape.each(adding, function (value) {
                    this.add(value);
                }, this);
            },
            'can.size': function () {
                return this.size;
            }
        });
        if (typeof Set.prototype[CanSymbol.iterator] !== 'function') {
            Set.prototype[CanSymbol.iterator] = function () {
                var arr = [];
                var currentIndex = 0;
                this.forEach(function (val) {
                    arr.push(val);
                });
                return {
                    next: function () {
                        return {
                            value: arr[currentIndex],
                            done: currentIndex++ === arr.length
                        };
                    }
                };
            };
        }
    }
    if (typeof WeakSet !== 'undefined') {
        shape.assignSymbols(WeakSet.prototype, {
            'can.isListLike': true,
            'can.isMoreListLikeThanMapLike': true,
            'can.updateValues': function (index, removing, adding) {
                if (removing !== adding) {
                    shape.each(removing, function (value) {
                        this.delete(value);
                    }, this);
                }
                shape.each(adding, function (value) {
                    this.add(value);
                }, this);
            },
            'can.size': function () {
                throw new Error('can-reflect: WeakSets do not have enumerable keys.');
            }
        });
    }
});
/*can-reflect@1.17.6#can-reflect*/
define('can-reflect@1.17.6#can-reflect', [
    'require',
    'exports',
    'module',
    './reflections/call/call',
    './reflections/get-set/get-set',
    './reflections/observe/observe',
    './reflections/shape/shape',
    './reflections/shape/schema/schema',
    './reflections/type/type',
    './reflections/get-name/get-name',
    'can-namespace',
    './types/map',
    './types/set'
], function (require, exports, module) {
    'use strict';
    var functionReflections = require('./reflections/call/call');
    var getSet = require('./reflections/get-set/get-set');
    var observe = require('./reflections/observe/observe');
    var shape = require('./reflections/shape/shape');
    var schema = require('./reflections/shape/schema/schema');
    var type = require('./reflections/type/type');
    var getName = require('./reflections/get-name/get-name');
    var namespace = require('can-namespace');
    var reflect = {};
    [
        functionReflections,
        getSet,
        observe,
        shape,
        type,
        getName,
        schema
    ].forEach(function (reflections) {
        for (var prop in reflections) {
            reflect[prop] = reflections[prop];
        }
    });
    require('./types/map');
    require('./types/set');
    module.exports = namespace.Reflect = reflect;
});
/*can-globals@1.2.0#can-globals-proto*/
define('can-globals@1.2.0#can-globals-proto', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var canReflect = require('can-reflect');
        function dispatch(key) {
            var handlers = this.eventHandlers[key];
            if (handlers) {
                var handlersCopy = handlers.slice();
                var value = this.getKeyValue(key);
                for (var i = 0; i < handlersCopy.length; i++) {
                    handlersCopy[i](value);
                }
            }
        }
        function Globals() {
            this.eventHandlers = {};
            this.properties = {};
        }
        Globals.prototype.define = function (key, value, enableCache) {
            if (enableCache === undefined) {
                enableCache = true;
            }
            if (!this.properties[key]) {
                this.properties[key] = {
                    default: value,
                    value: value,
                    enableCache: enableCache
                };
            }
            return this;
        };
        Globals.prototype.getKeyValue = function (key) {
            var property = this.properties[key];
            if (property) {
                if (typeof property.value === 'function') {
                    if (property.cachedValue) {
                        return property.cachedValue;
                    }
                    if (property.enableCache) {
                        property.cachedValue = property.value();
                        return property.cachedValue;
                    } else {
                        return property.value();
                    }
                }
                return property.value;
            }
        };
        Globals.prototype.makeExport = function (key) {
            return function (value) {
                if (arguments.length === 0) {
                    return this.getKeyValue(key);
                }
                if (typeof value === 'undefined' || value === null) {
                    this.deleteKeyValue(key);
                } else {
                    if (typeof value === 'function') {
                        this.setKeyValue(key, function () {
                            return value;
                        });
                    } else {
                        this.setKeyValue(key, value);
                    }
                    return value;
                }
            }.bind(this);
        };
        Globals.prototype.offKeyValue = function (key, handler) {
            if (this.properties[key]) {
                var handlers = this.eventHandlers[key];
                if (handlers) {
                    var i = handlers.indexOf(handler);
                    handlers.splice(i, 1);
                }
            }
            return this;
        };
        Globals.prototype.onKeyValue = function (key, handler) {
            if (this.properties[key]) {
                if (!this.eventHandlers[key]) {
                    this.eventHandlers[key] = [];
                }
                this.eventHandlers[key].push(handler);
            }
            return this;
        };
        Globals.prototype.deleteKeyValue = function (key) {
            var property = this.properties[key];
            if (property !== undefined) {
                property.value = property.default;
                property.cachedValue = undefined;
                dispatch.call(this, key);
            }
            return this;
        };
        Globals.prototype.setKeyValue = function (key, value) {
            if (!this.properties[key]) {
                return this.define(key, value);
            }
            var property = this.properties[key];
            property.value = value;
            property.cachedValue = undefined;
            dispatch.call(this, key);
            return this;
        };
        Globals.prototype.reset = function () {
            for (var key in this.properties) {
                if (this.properties.hasOwnProperty(key)) {
                    this.properties[key].value = this.properties[key].default;
                    this.properties[key].cachedValue = undefined;
                    dispatch.call(this, key);
                }
            }
            return this;
        };
        canReflect.assignSymbols(Globals.prototype, {
            'can.getKeyValue': Globals.prototype.getKeyValue,
            'can.setKeyValue': Globals.prototype.setKeyValue,
            'can.deleteKeyValue': Globals.prototype.deleteKeyValue,
            'can.onKeyValue': Globals.prototype.onKeyValue,
            'can.offKeyValue': Globals.prototype.offKeyValue
        });
        module.exports = Globals;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#can-globals-instance*/
define('can-globals@1.2.0#can-globals-instance', [
    'require',
    'exports',
    'module',
    'can-namespace',
    './can-globals-proto'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var namespace = require('can-namespace');
        var Globals = require('./can-globals-proto');
        var globals = new Globals();
        if (namespace.globals) {
            throw new Error('You can\'t have two versions of can-globals, check your dependencies');
        } else {
            module.exports = namespace.globals = globals;
        }
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#global/global*/
define('can-globals@1.2.0#global/global', [
    'require',
    'exports',
    'module',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals/can-globals-instance');
        globals.define('global', function () {
            return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope ? self : typeof process === 'object' && {}.toString.call(process) === '[object process]' ? global : window;
        });
        module.exports = globals.makeExport('global');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#document/document*/
define('can-globals@1.2.0#document/document', [
    'require',
    'exports',
    'module',
    'can-globals/global/global',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        require('can-globals/global/global');
        var globals = require('can-globals/can-globals-instance');
        globals.define('document', function () {
            return globals.getKeyValue('global').document;
        });
        module.exports = globals.makeExport('document');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#location/location*/
define('can-globals@1.2.0#location/location', [
    'require',
    'exports',
    'module',
    'can-globals/global/global',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        require('can-globals/global/global');
        var globals = require('can-globals/can-globals-instance');
        globals.define('location', function () {
            return globals.getKeyValue('global').location;
        });
        module.exports = globals.makeExport('location');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#mutation-observer/mutation-observer*/
define('can-globals@1.2.0#mutation-observer/mutation-observer', [
    'require',
    'exports',
    'module',
    'can-globals/global/global',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        require('can-globals/global/global');
        var globals = require('can-globals/can-globals-instance');
        globals.define('MutationObserver', function () {
            var GLOBAL = globals.getKeyValue('global');
            return GLOBAL.MutationObserver || GLOBAL.WebKitMutationObserver || GLOBAL.MozMutationObserver;
        });
        module.exports = globals.makeExport('MutationObserver');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#is-node/is-node*/
define('can-globals@1.2.0#is-node/is-node', [
    'require',
    'exports',
    'module',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals/can-globals-instance');
        globals.define('isNode', function () {
            return typeof process === 'object' && {}.toString.call(process) === '[object process]';
        });
        module.exports = globals.makeExport('isNode');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#is-browser-window/is-browser-window*/
define('can-globals@1.2.0#is-browser-window/is-browser-window', [
    'require',
    'exports',
    'module',
    'can-globals/can-globals-instance',
    '../is-node/is-node'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals/can-globals-instance');
        require('../is-node/is-node');
        globals.define('isBrowserWindow', function () {
            var isNode = globals.getKeyValue('isNode');
            return typeof window !== 'undefined' && typeof document !== 'undefined' && isNode === false;
        });
        module.exports = globals.makeExport('isBrowserWindow');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#custom-elements/custom-elements*/
define('can-globals@1.2.0#custom-elements/custom-elements', [
    'require',
    'exports',
    'module',
    'can-globals/global/global',
    'can-globals/can-globals-instance'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        require('can-globals/global/global');
        var globals = require('can-globals/can-globals-instance');
        globals.define('customElements', function () {
            var GLOBAL = globals.getKeyValue('global');
            return GLOBAL.customElements;
        });
        module.exports = globals.makeExport('customElements');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#can-globals*/
define('can-globals@1.2.0#can-globals', [
    'require',
    'exports',
    'module',
    'can-globals/can-globals-instance',
    './global/global',
    './document/document',
    './location/location',
    './mutation-observer/mutation-observer',
    './is-browser-window/is-browser-window',
    './is-node/is-node',
    './custom-elements/custom-elements'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals/can-globals-instance');
        require('./global/global');
        require('./document/document');
        require('./location/location');
        require('./mutation-observer/mutation-observer');
        require('./is-browser-window/is-browser-window');
        require('./is-node/is-node');
        require('./custom-elements/custom-elements');
        module.exports = globals;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-dom-mutate@1.2.2#-util*/
define('can-dom-mutate@1.2.2#-util', [
    'require',
    'exports',
    'module',
    'can-globals/document/document'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getDocument = require('can-globals/document/document');
        var push = Array.prototype.push;
        function eliminate(array, item) {
            var index = array.indexOf(item);
            if (index >= 0) {
                array.splice(index, 1);
            }
        }
        function isInDocument(node) {
            var root = getDocument();
            if (root === node) {
                return true;
            }
            return root.contains(node);
        }
        function isDocumentElement(node) {
            return getDocument().documentElement === node;
        }
        function isFragment(node) {
            return !!(node && node.nodeType === 11);
        }
        function getChildren(parentNode) {
            var nodes = [];
            var node = parentNode.firstChild;
            while (node) {
                nodes.push(node);
                node = node.nextSibling;
            }
            return nodes;
        }
        function getParents(node) {
            var nodes;
            if (isFragment(node)) {
                nodes = getChildren(node);
            } else {
                nodes = [node];
            }
            return nodes;
        }
        function getAllNodes(node) {
            var nodes = getParents(node);
            var cLen = nodes.length;
            for (var c = 0; c < cLen; c++) {
                var element = nodes[c];
                if (element.getElementsByTagName) {
                    var descendants = element.getElementsByTagName('*');
                    push.apply(nodes, descendants);
                }
            }
            return nodes;
        }
        function subscription(fn) {
            return function _subscription() {
                var disposal = fn.apply(this, arguments);
                var isDisposed = false;
                return function _disposal() {
                    if (isDisposed) {
                        var fnName = fn.name || fn.displayName || 'an anonymous function';
                        var message = 'Disposal function returned by ' + fnName + ' called more than once.';
                        throw new Error(message);
                    }
                    disposal.apply(this, arguments);
                    isDisposed = true;
                };
            };
        }
        module.exports = {
            eliminate: eliminate,
            isInDocument: isInDocument,
            getDocument: getDocument,
            isDocumentElement: isDocumentElement,
            isFragment: isFragment,
            getParents: getParents,
            getAllNodes: getAllNodes,
            getChildren: getChildren,
            subscription: subscription
        };
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-dom-mutate@1.2.2#can-dom-mutate*/
define('can-dom-mutate@1.2.2#can-dom-mutate', [
    'require',
    'exports',
    'module',
    'can-globals',
    'can-globals/global/global',
    'can-globals/mutation-observer/mutation-observer',
    'can-namespace',
    './-util'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals');
        var getRoot = require('can-globals/global/global');
        var getMutationObserver = require('can-globals/mutation-observer/mutation-observer');
        var namespace = require('can-namespace');
        var setImmediate = getRoot().setImmediate || function (cb) {
            return setTimeout(cb, 0);
        };
        var util = require('./-util');
        var getDocument = util.getDocument;
        var eliminate = util.eliminate;
        var subscription = util.subscription;
        var isDocumentElement = util.isDocumentElement;
        var getAllNodes = util.getAllNodes;
        var push = Array.prototype.push;
        var slice = Array.prototype.slice;
        var domMutate;
        var dataStore = new WeakMap();
        function getRelatedData(node, key) {
            var data = dataStore.get(node);
            if (data) {
                return data[key];
            }
        }
        function setRelatedData(node, key, targetListenersMap) {
            var data = dataStore.get(node);
            if (!data) {
                data = {};
                dataStore.set(node, data);
            }
            data[key] = targetListenersMap;
        }
        function deleteRelatedData(node, key) {
            var data = dataStore.get(node);
            return delete data[key];
        }
        function batch(processBatchItems, shouldDeduplicate) {
            var waitingBatch = [];
            var waitingCalls = [];
            var dispatchSet = new Set();
            var isPrimed = false;
            return function batchAdd(items, callback) {
                if (shouldDeduplicate) {
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        var target = item.target;
                        if (!dispatchSet.has(target)) {
                            waitingBatch.push(item);
                            dispatchSet.add(target);
                        }
                    }
                } else {
                    push.apply(waitingBatch, items);
                }
                if (callback) {
                    waitingCalls.push(callback);
                }
                var shouldPrime = !isPrimed && waitingBatch.length > 0;
                if (shouldPrime) {
                    isPrimed = true;
                    setImmediate(function processBatch() {
                        var currentBatch = waitingBatch;
                        waitingBatch = [];
                        var currentCalls = waitingCalls;
                        waitingCalls = [];
                        if (shouldDeduplicate) {
                            dispatchSet = new Set();
                        }
                        isPrimed = false;
                        processBatchItems(currentBatch);
                        var callCount = currentCalls.length;
                        for (var c = 0; c < callCount; c++) {
                            currentCalls[c]();
                        }
                    });
                }
            };
        }
        function getDocumentListeners(target, key) {
            var doc = getDocument();
            var data = getRelatedData(doc, key);
            if (data) {
                return data.listeners;
            }
        }
        function getTargetListeners(target, key) {
            var doc = getDocument();
            var targetListenersMap = getRelatedData(doc, key);
            if (!targetListenersMap) {
                return;
            }
            return targetListenersMap.get(target);
        }
        function addTargetListener(target, key, listener) {
            var doc = getDocument();
            var targetListenersMap = getRelatedData(doc, key);
            if (!targetListenersMap) {
                targetListenersMap = new Map();
                setRelatedData(doc, key, targetListenersMap);
            }
            var targetListeners = targetListenersMap.get(target);
            if (!targetListeners) {
                targetListeners = [];
                targetListenersMap.set(target, targetListeners);
            }
            targetListeners.push(listener);
        }
        function removeTargetListener(target, key, listener) {
            var doc = getDocument();
            var targetListenersMap = getRelatedData(doc, key);
            if (!targetListenersMap) {
                return;
            }
            var targetListeners = targetListenersMap.get(target);
            if (!targetListeners) {
                return;
            }
            eliminate(targetListeners, listener);
            if (targetListeners.length === 0) {
                targetListenersMap['delete'](target);
                if (targetListenersMap.size === 0) {
                    deleteRelatedData(doc, key);
                }
            }
        }
        function fire(callbacks, arg) {
            var safeCallbacks = slice.call(callbacks, 0);
            var safeCallbackCount = safeCallbacks.length;
            for (var i = 0; i < safeCallbackCount; i++) {
                safeCallbacks[i](arg);
            }
        }
        function dispatch(listenerKey, documentDataKey) {
            return function dispatchEvents(events) {
                for (var e = 0; e < events.length; e++) {
                    var event = events[e];
                    var target = event.target;
                    var targetListeners = getTargetListeners(target, listenerKey);
                    if (targetListeners) {
                        fire(targetListeners, event);
                    }
                    if (!documentDataKey) {
                        continue;
                    }
                    var documentListeners = getDocumentListeners(target, documentDataKey);
                    if (documentListeners) {
                        fire(documentListeners, event);
                    }
                }
            };
        }
        function observeMutations(target, observerKey, config, handler) {
            var observerData = getRelatedData(target, observerKey);
            if (!observerData) {
                observerData = { observingCount: 0 };
                setRelatedData(target, observerKey, observerData);
            }
            var setupObserver = function () {
                var MutationObserver = getMutationObserver();
                if (MutationObserver) {
                    var Node = getRoot().Node;
                    var isRealNode = !!(Node && target instanceof Node);
                    if (isRealNode) {
                        var targetObserver = new MutationObserver(handler);
                        targetObserver.observe(target, config);
                        observerData.observer = targetObserver;
                    }
                } else {
                    if (observerData.observer) {
                        observerData.observer.disconnect();
                        observerData.observer = null;
                    }
                }
            };
            if (observerData.observingCount === 0) {
                globals.onKeyValue('MutationObserver', setupObserver);
                setupObserver();
            }
            observerData.observingCount++;
            return function stopObservingMutations() {
                var observerData = getRelatedData(target, observerKey);
                if (observerData) {
                    observerData.observingCount--;
                    if (observerData.observingCount <= 0) {
                        if (observerData.observer) {
                            observerData.observer.disconnect();
                        }
                        deleteRelatedData(target, observerKey);
                        globals.offKeyValue('MutationObserver', setupObserver);
                    }
                }
            };
        }
        function handleTreeMutations(mutations) {
            var mutationCount = mutations.length;
            for (var m = 0; m < mutationCount; m++) {
                var mutation = mutations[m];
                var addedNodes = mutation.addedNodes;
                var addedCount = addedNodes.length;
                for (var a = 0; a < addedCount; a++) {
                    domMutate.dispatchNodeInsertion(addedNodes[a]);
                }
                var removedNodes = mutation.removedNodes;
                var removedCount = removedNodes.length;
                for (var r = 0; r < removedCount; r++) {
                    domMutate.dispatchNodeRemoval(removedNodes[r]);
                }
            }
        }
        function handleAttributeMutations(mutations) {
            var mutationCount = mutations.length;
            for (var m = 0; m < mutationCount; m++) {
                var mutation = mutations[m];
                if (mutation.type === 'attributes') {
                    var node = mutation.target;
                    var attributeName = mutation.attributeName;
                    var oldValue = mutation.oldValue;
                    domMutate.dispatchNodeAttributeChange(node, attributeName, oldValue);
                }
            }
        }
        var treeMutationConfig = {
            subtree: true,
            childList: true
        };
        var attributeMutationConfig = {
            attributes: true,
            attributeOldValue: true
        };
        function addNodeListener(listenerKey, observerKey, isAttributes) {
            return subscription(function _addNodeListener(target, listener) {
                if (target.nodeType === 11) {
                    return Function.prototype;
                }
                var stopObserving;
                if (isAttributes) {
                    stopObserving = observeMutations(target, observerKey, attributeMutationConfig, handleAttributeMutations);
                } else {
                    stopObserving = observeMutations(getDocument(), observerKey, treeMutationConfig, handleTreeMutations);
                }
                addTargetListener(target, listenerKey, listener);
                return function removeNodeListener() {
                    stopObserving();
                    removeTargetListener(target, listenerKey, listener);
                };
            });
        }
        function addGlobalListener(globalDataKey, addNodeListener) {
            return subscription(function addGlobalGroupListener(documentElement, listener) {
                if (!isDocumentElement(documentElement)) {
                    throw new Error('Global mutation listeners must pass a documentElement');
                }
                var doc = getDocument();
                var documentData = getRelatedData(doc, globalDataKey);
                if (!documentData) {
                    documentData = { listeners: [] };
                    setRelatedData(doc, globalDataKey, documentData);
                }
                var listeners = documentData.listeners;
                if (listeners.length === 0) {
                    documentData.removeListener = addNodeListener(doc, function () {
                    });
                }
                listeners.push(listener);
                return function removeGlobalGroupListener() {
                    var documentData = getRelatedData(doc, globalDataKey);
                    if (!documentData) {
                        return;
                    }
                    var listeners = documentData.listeners;
                    eliminate(listeners, listener);
                    if (listeners.length === 0) {
                        documentData.removeListener();
                        deleteRelatedData(doc, globalDataKey);
                    }
                };
            });
        }
        function toMutationEvents(nodes) {
            var events = [];
            for (var i = 0; i < nodes.length; i++) {
                events.push({ target: nodes[i] });
            }
            return events;
        }
        var domMutationPrefix = 'domMutation';
        var insertionDataKey = domMutationPrefix + 'InsertionData';
        var removalDataKey = domMutationPrefix + 'RemovalData';
        var attributeChangeDataKey = domMutationPrefix + 'AttributeChangeData';
        var documentInsertionDataKey = domMutationPrefix + 'DocumentInsertionData';
        var documentRemovalDataKey = domMutationPrefix + 'DocumentRemovalData';
        var documentAttributeChangeDataKey = domMutationPrefix + 'DocumentAttributeChangeData';
        var treeDataKey = domMutationPrefix + 'TreeData';
        var attributeDataKey = domMutationPrefix + 'AttributeData';
        var dispatchInsertion = batch(dispatch(insertionDataKey, documentInsertionDataKey), true);
        var dispatchRemoval = batch(dispatch(removalDataKey, documentRemovalDataKey), true);
        var dispatchAttributeChange = batch(dispatch(attributeChangeDataKey, documentAttributeChangeDataKey));
        var addNodeInsertionListener = addNodeListener(insertionDataKey, treeDataKey);
        var addNodeRemovalListener = addNodeListener(removalDataKey, treeDataKey);
        var addNodeAttributeChangeListener = addNodeListener(attributeChangeDataKey, attributeDataKey, true);
        var addInsertionListener = addGlobalListener(documentInsertionDataKey, addNodeInsertionListener);
        var addRemovalListener = addGlobalListener(documentRemovalDataKey, addNodeRemovalListener);
        var addAttributeChangeListener = addGlobalListener(documentAttributeChangeDataKey, addNodeAttributeChangeListener);
        domMutate = {
            dispatchNodeInsertion: function (node, callback) {
                var events = toMutationEvents(getAllNodes(node));
                dispatchInsertion(events, callback);
            },
            dispatchNodeRemoval: function (node, callback) {
                var events = toMutationEvents(getAllNodes(node));
                dispatchRemoval(events, callback);
            },
            dispatchNodeAttributeChange: function (target, attributeName, oldValue, callback) {
                dispatchAttributeChange([{
                        target: target,
                        attributeName: attributeName,
                        oldValue: oldValue
                    }], callback);
            },
            onNodeInsertion: addNodeInsertionListener,
            onNodeRemoval: addNodeRemovalListener,
            onNodeAttributeChange: addNodeAttributeChangeListener,
            onRemoval: addRemovalListener,
            onInsertion: addInsertionListener,
            onAttributeChange: addAttributeChangeListener
        };
        module.exports = namespace.domMutate = domMutate;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-dom-mutate@1.2.2#node*/
define('can-dom-mutate@1.2.2#node', [
    'require',
    'exports',
    'module',
    'can-globals',
    'can-namespace',
    './can-dom-mutate',
    './-util'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('can-globals');
        var namespace = require('can-namespace');
        var domMutate = require('./can-dom-mutate');
        var util = require('./-util');
        var isInDocument = util.isInDocument;
        var getParents = util.getParents;
        var synthetic = {
            dispatchNodeInsertion: function (container, node) {
                if (isInDocument(node)) {
                    domMutate.dispatchNodeInsertion(node);
                }
            },
            dispatchNodeRemoval: function (container, node) {
                if (isInDocument(container) && !isInDocument(node)) {
                    domMutate.dispatchNodeRemoval(node);
                }
            }
        };
        var compat = {
            replaceChild: function (newChild, oldChild) {
                var newChildren = getParents(newChild);
                var result = this.replaceChild(newChild, oldChild);
                synthetic.dispatchNodeRemoval(this, oldChild);
                for (var i = 0; i < newChildren.length; i++) {
                    synthetic.dispatchNodeInsertion(this, newChildren[i]);
                }
                return result;
            },
            setAttribute: function (name, value) {
                var oldAttributeValue = this.getAttribute(name);
                var result = this.setAttribute(name, value);
                var newAttributeValue = this.getAttribute(name);
                if (oldAttributeValue !== newAttributeValue) {
                    domMutate.dispatchNodeAttributeChange(this, name, oldAttributeValue);
                }
                return result;
            },
            removeAttribute: function (name) {
                var oldAttributeValue = this.getAttribute(name);
                var result = this.removeAttribute(name);
                if (oldAttributeValue) {
                    domMutate.dispatchNodeAttributeChange(this, name, oldAttributeValue);
                }
                return result;
            }
        };
        var compatData = [
            [
                'appendChild',
                'Insertion'
            ],
            [
                'insertBefore',
                'Insertion'
            ],
            [
                'removeChild',
                'Removal'
            ]
        ];
        compatData.forEach(function (pair) {
            var nodeMethod = pair[0];
            var dispatchMethod = 'dispatchNode' + pair[1];
            compat[nodeMethod] = function (node) {
                var nodes = getParents(node);
                var result = this[nodeMethod].apply(this, arguments);
                for (var i = 0; i < nodes.length; i++) {
                    synthetic[dispatchMethod](this, nodes[i]);
                }
                return result;
            };
        });
        var normal = {};
        var nodeMethods = [
            'appendChild',
            'insertBefore',
            'removeChild',
            'replaceChild',
            'setAttribute',
            'removeAttribute'
        ];
        nodeMethods.forEach(function (methodName) {
            normal[methodName] = function () {
                return this[methodName].apply(this, arguments);
            };
        });
        var mutate = {};
        function setMutateStrategy(observer) {
            var strategy = observer ? normal : compat;
            for (var key in strategy) {
                mutate[key] = strategy[key];
            }
        }
        var mutationObserverKey = 'MutationObserver';
        setMutateStrategy(globals.getKeyValue(mutationObserverKey));
        globals.onKeyValue(mutationObserverKey, setMutateStrategy);
        module.exports = namespace.domMutateNode = mutate;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-nodelist@4.3.2#can-view-nodelist*/
define('can-view-nodelist@4.3.2#can-view-nodelist', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-dom-mutate/node'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var domMutate = require('can-dom-mutate/node');
    var nodeMap = new Map(), splice = [].splice, push = [].push, itemsInChildListTree = function (list) {
            var count = 0;
            for (var i = 0, len = list.length; i < len; i++) {
                var item = list[i];
                if (item.nodeType) {
                    count++;
                } else {
                    count += itemsInChildListTree(item);
                }
            }
            return count;
        }, replacementMap = function (replacements) {
            var map = new Map();
            for (var i = 0, len = replacements.length; i < len; i++) {
                var node = nodeLists.first(replacements[i]);
                map.set(node, replacements[i]);
            }
            return map;
        }, addUnfoundAsDeepChildren = function (list, rMap) {
            rMap.forEach(function (replacement) {
                list.newDeepChildren.push(replacement);
            });
        };
    var nodeLists = {
        update: function (nodeList, newNodes, oldNodes) {
            if (!oldNodes) {
                oldNodes = nodeLists.unregisterChildren(nodeList);
            }
            var arr = [];
            for (var i = 0, ref = arr.length = newNodes.length; i < ref; i++) {
                arr[i] = newNodes[i];
            }
            newNodes = arr;
            var oldListLength = nodeList.length;
            splice.apply(nodeList, [
                0,
                oldListLength
            ].concat(newNodes));
            if (nodeList.replacements) {
                nodeLists.nestReplacements(nodeList);
                nodeList.deepChildren = nodeList.newDeepChildren;
                nodeList.newDeepChildren = [];
            } else {
                nodeLists.nestList(nodeList);
            }
            return oldNodes;
        },
        nestReplacements: function (list) {
            var index = 0, rMap = replacementMap(list.replacements), rCount = list.replacements.length;
            while (index < list.length && rCount) {
                var node = list[index], replacement = rMap.get(node);
                if (replacement) {
                    rMap['delete'](node);
                    list.splice(index, itemsInChildListTree(replacement), replacement);
                    rCount--;
                }
                index++;
            }
            if (rCount) {
                addUnfoundAsDeepChildren(list, rMap);
            }
            list.replacements = [];
        },
        nestList: function (list) {
            var index = 0;
            while (index < list.length) {
                var node = list[index], childNodeList = nodeMap.get(node);
                if (childNodeList) {
                    if (childNodeList !== list) {
                        list.splice(index, itemsInChildListTree(childNodeList), childNodeList);
                    }
                } else {
                    nodeMap.set(node, list);
                }
                index++;
            }
        },
        last: function (nodeList) {
            var last = nodeList[nodeList.length - 1];
            if (last.nodeType) {
                return last;
            } else {
                return nodeLists.last(last);
            }
        },
        first: function (nodeList) {
            var first = nodeList[0];
            if (first.nodeType) {
                return first;
            } else {
                return nodeLists.first(first);
            }
        },
        flatten: function (nodeList) {
            var items = [];
            for (var i = 0; i < nodeList.length; i++) {
                var item = nodeList[i];
                if (item.nodeType) {
                    items.push(item);
                } else {
                    items.push.apply(items, nodeLists.flatten(item));
                }
            }
            return items;
        },
        register: function (nodeList, unregistered, parent, directlyNested) {
            nodeList.unregistered = unregistered;
            nodeList.parentList = parent;
            nodeList.nesting = parent && typeof parent.nesting !== 'undefined' ? parent.nesting + 1 : 0;
            if (parent) {
                nodeList.deepChildren = [];
                nodeList.newDeepChildren = [];
                nodeList.replacements = [];
                if (parent !== true) {
                    if (directlyNested) {
                        parent.replacements.push(nodeList);
                    } else {
                        parent.newDeepChildren.push(nodeList);
                    }
                }
            } else {
                nodeLists.nestList(nodeList);
            }
            return nodeList;
        },
        unregisterChildren: function (nodeList) {
            var nodes = [];
            for (var n = 0; n < nodeList.length; n++) {
                var node = nodeList[n];
                if (node.nodeType) {
                    if (!nodeList.replacements) {
                        nodeMap['delete'](node);
                    }
                    nodes.push(node);
                } else {
                    push.apply(nodes, nodeLists.unregister(node, true));
                }
            }
            var deepChildren = nodeList.deepChildren;
            if (deepChildren) {
                for (var l = 0; l < deepChildren.length; l++) {
                    nodeLists.unregister(deepChildren[l], true);
                }
            }
            return nodes;
        },
        unregister: function (nodeList, isChild) {
            var nodes = nodeLists.unregisterChildren(nodeList, true);
            nodeList.isUnregistered = true;
            if (nodeList.unregistered) {
                var unregisteredCallback = nodeList.unregistered;
                nodeList.replacements = nodeList.unregistered = null;
                if (!isChild) {
                    var deepChildren = nodeList.parentList && nodeList.parentList.deepChildren;
                    if (deepChildren) {
                        var index = deepChildren.indexOf(nodeList);
                        if (index !== -1) {
                            deepChildren.splice(index, 1);
                        }
                    }
                }
                unregisteredCallback();
            }
            return nodes;
        },
        after: function (oldElements, newFrag) {
            var last = oldElements[oldElements.length - 1];
            if (last.nextSibling) {
                domMutate.insertBefore.call(last.parentNode, newFrag, last.nextSibling);
            } else {
                domMutate.appendChild.call(last.parentNode, newFrag);
            }
        },
        replace: function (oldElements, newFrag) {
            var selectedValue, parentNode = oldElements[0].parentNode;
            if (parentNode.nodeName.toUpperCase() === 'SELECT' && parentNode.selectedIndex >= 0) {
                selectedValue = parentNode.value;
            }
            if (oldElements.length === 1) {
                domMutate.replaceChild.call(parentNode, newFrag, oldElements[0]);
            } else {
                nodeLists.after(oldElements, newFrag);
                nodeLists.remove(oldElements);
            }
            if (selectedValue !== undefined) {
                parentNode.value = selectedValue;
            }
        },
        remove: function (elementsToBeRemoved) {
            var parent = elementsToBeRemoved[0] && elementsToBeRemoved[0].parentNode;
            for (var i = 0; i < elementsToBeRemoved.length; i++) {
                domMutate.removeChild.call(parent, elementsToBeRemoved[i]);
            }
        },
        nodeMap: nodeMap
    };
    module.exports = namespace.nodeLists = nodeLists;
});
/*can-child-nodes@1.2.0#can-child-nodes*/
define('can-child-nodes@1.2.0#can-child-nodes', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    function childNodes(node) {
        var childNodes = node.childNodes;
        if ('length' in childNodes) {
            return childNodes;
        } else {
            var cur = node.firstChild;
            var nodes = [];
            while (cur) {
                nodes.push(cur);
                cur = cur.nextSibling;
            }
            return nodes;
        }
    }
    module.exports = namespace.childNodes = childNodes;
});
/*can-fragment@1.3.0#can-fragment*/
define('can-fragment@1.3.0#can-fragment', [
    'require',
    'exports',
    'module',
    'can-globals/document/document',
    'can-namespace',
    'can-reflect',
    'can-child-nodes',
    'can-symbol'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getDocument = require('can-globals/document/document');
        var namespace = require('can-namespace');
        var canReflect = require('can-reflect');
        var childNodes = require('can-child-nodes');
        var canSymbol = require('can-symbol');
        var fragmentRE = /^\s*<(\w+)[^>]*>/, toString = {}.toString, toDOMSymbol = canSymbol.for('can.toDOM');
        function makeFragment(html, name, doc) {
            if (name === undefined) {
                name = fragmentRE.test(html) && RegExp.$1;
            }
            if (html && toString.call(html.replace) === '[object Function]') {
                html = html.replace(/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, '<$1></$2>');
            }
            var container = doc.createElement('div'), temp = doc.createElement('div');
            if (name === 'tbody' || name === 'tfoot' || name === 'thead' || name === 'colgroup') {
                temp.innerHTML = '<table>' + html + '</table>';
                container = temp.firstChild.nodeType === 3 ? temp.lastChild : temp.firstChild;
            } else if (name === 'col') {
                temp.innerHTML = '<table><colgroup>' + html + '</colgroup></table>';
                container = temp.firstChild.nodeType === 3 ? temp.lastChild : temp.firstChild.firstChild;
            } else if (name === 'tr') {
                temp.innerHTML = '<table><tbody>' + html + '</tbody></table>';
                container = temp.firstChild.nodeType === 3 ? temp.lastChild : temp.firstChild.firstChild;
            } else if (name === 'td' || name === 'th') {
                temp.innerHTML = '<table><tbody><tr>' + html + '</tr></tbody></table>';
                container = temp.firstChild.nodeType === 3 ? temp.lastChild : temp.firstChild.firstChild.firstChild;
            } else if (name === 'option') {
                temp.innerHTML = '<select>' + html + '</select>';
                container = temp.firstChild.nodeType === 3 ? temp.lastChild : temp.firstChild;
            } else {
                container.innerHTML = '' + html;
            }
            return [].slice.call(childNodes(container));
        }
        function fragment(html, doc) {
            if (html && html.nodeType === 11) {
                return html;
            }
            if (!doc) {
                doc = getDocument();
            } else if (doc.length) {
                doc = doc[0];
            }
            var parts = makeFragment(html, undefined, doc), frag = (doc || document).createDocumentFragment();
            for (var i = 0, length = parts.length; i < length; i++) {
                frag.appendChild(parts[i]);
            }
            return frag;
        }
        var makeFrag = function (item, doc) {
            var document = doc || getDocument();
            var frag;
            if (!item || typeof item === 'string') {
                frag = fragment(item == null ? '' : '' + item, document);
            } else if (typeof item[toDOMSymbol] === 'function') {
                return makeFrag(item[toDOMSymbol]());
            } else if (item.nodeType === 11) {
                return item;
            } else if (typeof item.nodeType === 'number') {
                frag = document.createDocumentFragment();
                frag.appendChild(item);
                return frag;
            } else if (canReflect.isListLike(item)) {
                frag = document.createDocumentFragment();
                canReflect.eachIndex(item, function (item) {
                    frag.appendChild(makeFrag(item));
                });
            } else {
                frag = fragment('' + item, document);
            }
            if (!childNodes(frag).length) {
                frag.appendChild(document.createTextNode(''));
            }
            return frag;
        };
        module.exports = namespace.fragment = namespace.frag = makeFrag;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-callbacks@4.3.1#can-view-callbacks*/
define('can-view-callbacks@4.3.1#can-view-callbacks', [
    'require',
    'exports',
    'module',
    'can-observation-recorder',
    'can-log/dev/dev',
    'can-globals/global/global',
    'can-dom-mutate/node',
    'can-namespace',
    'can-view-nodelist',
    'can-fragment',
    'can-globals',
    'can-symbol',
    'can-reflect'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var ObservationRecorder = require('can-observation-recorder');
        var dev = require('can-log/dev/dev');
        var getGlobal = require('can-globals/global/global');
        var domMutate = require('can-dom-mutate/node');
        var namespace = require('can-namespace');
        var nodeLists = require('can-view-nodelist');
        var makeFrag = require('can-fragment');
        var globals = require('can-globals');
        var canSymbol = require('can-symbol');
        var canReflect = require('can-reflect');
        var callbackMapSymbol = canSymbol.for('can.callbackMap');
        var tags = {};
        var automountEnabled = function () {
            var document = globals.getKeyValue('document');
            if (document == null || document.documentElement == null) {
                return false;
            }
            return document.documentElement.getAttribute('data-can-automount') !== 'false';
        };
        var renderedElements = new WeakMap();
        var renderNodeAndChildren = function (node) {
            var tagName = node.tagName && node.tagName.toLowerCase();
            var tagHandler = tags[tagName];
            var children;
            if (tagHandler && !renderedElements.has(node)) {
                tagHandler(node, {});
            }
            if (node.getElementsByTagName) {
                children = node.getElementsByTagName('*');
                for (var k = 0, child; (child = children[k]) !== undefined; k++) {
                    renderNodeAndChildren(child);
                }
            }
        };
        var mutationObserverEnabled = false;
        var globalMutationObserver;
        var enableMutationObserver = function () {
            if (mutationObserverEnabled) {
                return;
            }
            var mutationHandler = function (mutationsList) {
                var addedNodes;
                for (var i = 0, mutation; (mutation = mutationsList[i]) !== undefined; i++) {
                    if (mutation.type === 'childList') {
                        addedNodes = mutation.addedNodes;
                        for (var j = 0, addedNode; (addedNode = addedNodes[j]) !== undefined; j++) {
                            if (!renderedElements.has(addedNode)) {
                                renderNodeAndChildren(addedNode);
                            }
                        }
                    }
                }
            };
            var MutationObserver = globals.getKeyValue('MutationObserver');
            if (MutationObserver) {
                globalMutationObserver = new MutationObserver(mutationHandler);
                globalMutationObserver.observe(getGlobal().document.documentElement, {
                    childList: true,
                    subtree: true
                });
                mutationObserverEnabled = true;
            }
        };
        var renderTagsInDocument = function (tagName) {
            var nodes = getGlobal().document.getElementsByTagName(tagName);
            for (var i = 0, node; (node = nodes[i]) !== undefined; i++) {
                renderNodeAndChildren(node);
            }
        };
        var attr = function (attributeName, attrHandler) {
            if (attrHandler) {
                if (typeof attributeName === 'string') {
                    attributes[attributeName] = attrHandler;
                } else {
                    regExpAttributes.push({
                        match: attributeName,
                        handler: attrHandler
                    });
                }
            } else {
                var cb = attributes[attributeName];
                if (!cb) {
                    for (var i = 0, len = regExpAttributes.length; i < len; i++) {
                        var attrMatcher = regExpAttributes[i];
                        if (attrMatcher.match.test(attributeName)) {
                            return attrMatcher.handler;
                        }
                    }
                }
                return cb;
            }
        };
        var attrs = function (attrMap) {
            var map = canReflect.getKeyValue(attrMap, callbackMapSymbol) || attrMap;
            if (attrMaps.has(map)) {
                return;
            } else {
                attrMaps.set(map, true);
            }
            canReflect.eachKey(map, function (callback, exp) {
                attr(exp, callback);
            });
        };
        var attributes = {}, regExpAttributes = [], attrMaps = new WeakMap(), automaticCustomElementCharacters = /[-\:]/;
        var defaultCallback = function () {
        };
        var tag = function (tagName, tagHandler) {
            if (tagHandler) {
                var GLOBAL = getGlobal();
                var validCustomElementName = automaticCustomElementCharacters.test(tagName), tagExists = typeof tags[tagName.toLowerCase()] !== 'undefined', customElementExists;
                if (GLOBAL.html5) {
                    GLOBAL.html5.elements += ' ' + tagName;
                    GLOBAL.html5.shivDocument();
                }
                tags[tagName.toLowerCase()] = tagHandler;
                if (automountEnabled()) {
                    var customElements = globals.getKeyValue('customElements');
                    if (customElements) {
                        customElementExists = customElements.get(tagName.toLowerCase());
                        if (validCustomElementName && !customElementExists) {
                            var CustomElement = function () {
                                return Reflect.construct(HTMLElement, [], CustomElement);
                            };
                            CustomElement.prototype = Object.create(HTMLElement.prototype);
                            CustomElement.prototype.connectedCallback = function () {
                                if (!renderedElements.has(this)) {
                                    tags[tagName.toLowerCase()](this, {});
                                }
                            };
                            customElements.define(tagName, CustomElement);
                        }
                    } else {
                        enableMutationObserver();
                        renderTagsInDocument(tagName);
                    }
                } else if (mutationObserverEnabled) {
                    globalMutationObserver.disconnect();
                }
            } else {
                var cb;
                if (tagHandler === null) {
                    delete tags[tagName.toLowerCase()];
                } else {
                    cb = tags[tagName.toLowerCase()];
                }
                if (!cb && automaticCustomElementCharacters.test(tagName)) {
                    cb = defaultCallback;
                }
                return cb;
            }
        };
        var callbacks = {
            _tags: tags,
            _attributes: attributes,
            _regExpAttributes: regExpAttributes,
            defaultCallback: defaultCallback,
            tag: tag,
            attr: attr,
            attrs: attrs,
            tagHandler: function (el, tagName, tagData) {
                var scope = tagData.scope, helperTagCallback = scope && scope.templateContext.tags.get(tagName), tagCallback = helperTagCallback || tags[tagName], res;
                if (tagCallback) {
                    res = ObservationRecorder.ignore(tagCallback)(el, tagData);
                    renderedElements.set(el, true);
                } else {
                    res = scope;
                }
                if (res && tagData.subtemplate) {
                    if (scope !== res) {
                        scope = scope.add(res);
                    }
                    var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true, false);
                    nodeList.expression = '<' + el.tagName + '>';
                    var result = tagData.subtemplate(scope, tagData.options, nodeList);
                    var frag = typeof result === 'string' ? makeFrag(result) : result;
                    domMutate.appendChild.call(el, frag);
                }
            }
        };
        namespace.view = namespace.view || {};
        if (namespace.view.callbacks) {
            throw new Error('You can\'t have two versions of can-view-callbacks, check your dependencies');
        } else {
            module.exports = namespace.view.callbacks = callbacks;
        }
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-target@4.1.0#can-view-target*/
define('can-view-target@4.1.0#can-view-target', [
    'require',
    'exports',
    'module',
    'can-globals/document/document',
    'can-dom-mutate/node',
    'can-namespace',
    'can-globals/mutation-observer/mutation-observer'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getDocument = require('can-globals/document/document');
        var domMutate = require('can-dom-mutate/node');
        var namespace = require('can-namespace');
        var MUTATION_OBSERVER = require('can-globals/mutation-observer/mutation-observer');
        var processNodes = function (nodes, paths, location, document) {
                var frag = document.createDocumentFragment();
                for (var i = 0, len = nodes.length; i < len; i++) {
                    var node = nodes[i];
                    frag.appendChild(processNode(node, paths, location.concat(i), document));
                }
                return frag;
            }, keepsTextNodes = typeof document !== 'undefined' && function () {
                var testFrag = document.createDocumentFragment();
                var div = document.createElement('div');
                div.appendChild(document.createTextNode(''));
                div.appendChild(document.createTextNode(''));
                testFrag.appendChild(div);
                var cloned = testFrag.cloneNode(true);
                return cloned.firstChild.childNodes.length === 2;
            }(), clonesWork = typeof document !== 'undefined' && function () {
                var el = document.createElement('a');
                el.innerHTML = '<xyz></xyz>';
                var clone = el.cloneNode(true);
                var works = clone.innerHTML === '<xyz></xyz>';
                var MO, observer;
                if (works) {
                    el = document.createDocumentFragment();
                    el.appendChild(document.createTextNode('foo-bar'));
                    MO = MUTATION_OBSERVER();
                    if (MO) {
                        observer = new MO(function () {
                        });
                        observer.observe(document.documentElement, {
                            childList: true,
                            subtree: true
                        });
                        clone = el.cloneNode(true);
                        observer.disconnect();
                    } else {
                        clone = el.cloneNode(true);
                    }
                    return clone.childNodes.length === 1;
                }
                return works;
            }(), namespacesWork = typeof document !== 'undefined' && !!document.createElementNS;
        var cloneNode = clonesWork ? function (el) {
            return el.cloneNode(true);
        } : function (node) {
            var document = node.ownerDocument;
            var copy;
            if (node.nodeType === 1) {
                if (node.namespaceURI !== 'http://www.w3.org/1999/xhtml' && namespacesWork && document.createElementNS) {
                    copy = document.createElementNS(node.namespaceURI, node.nodeName);
                } else {
                    copy = document.createElement(node.nodeName);
                }
            } else if (node.nodeType === 3) {
                copy = document.createTextNode(node.nodeValue);
            } else if (node.nodeType === 8) {
                copy = document.createComment(node.nodeValue);
            } else if (node.nodeType === 11) {
                copy = document.createDocumentFragment();
            }
            if (node.attributes) {
                var attributes = node.attributes;
                for (var i = 0; i < attributes.length; i++) {
                    var attribute = attributes[i];
                    if (attribute && attribute.specified) {
                        domMutate.setAttribute.call(copy, attribute.nodeName || attribute.name, attribute.nodeValue || attribute.value);
                    }
                }
            }
            if (node && node.firstChild) {
                var child = node.firstChild;
                while (child) {
                    copy.appendChild(cloneNode(child));
                    child = child.nextSibling;
                }
            }
            return copy;
        };
        function processNode(node, paths, location, document) {
            var callback, loc = location, nodeType = typeof node, el, p, i, len;
            var getCallback = function () {
                if (!callback) {
                    callback = {
                        path: location,
                        callbacks: []
                    };
                    paths.push(callback);
                    loc = [];
                }
                return callback;
            };
            if (nodeType === 'object') {
                if (node.tag) {
                    if (namespacesWork && node.namespace) {
                        el = document.createElementNS(node.namespace, node.tag);
                    } else {
                        el = document.createElement(node.tag);
                    }
                    if (node.attrs) {
                        for (var attrName in node.attrs) {
                            var value = node.attrs[attrName];
                            if (typeof value === 'function') {
                                getCallback().callbacks.push({ callback: value });
                            } else {
                                domMutate.setAttribute.call(el, attrName, value);
                            }
                        }
                    }
                    if (node.attributes) {
                        for (i = 0, len = node.attributes.length; i < len; i++) {
                            getCallback().callbacks.push({ callback: node.attributes[i] });
                        }
                    }
                    if (node.children && node.children.length) {
                        if (callback) {
                            p = callback.paths = [];
                        } else {
                            p = paths;
                        }
                        el.appendChild(processNodes(node.children, p, loc, document));
                    }
                } else if (node.comment) {
                    el = document.createComment(node.comment);
                    if (node.callbacks) {
                        for (i = 0, len = node.attributes.length; i < len; i++) {
                            getCallback().callbacks.push({ callback: node.callbacks[i] });
                        }
                    }
                }
            } else if (nodeType === 'string') {
                el = document.createTextNode(node);
            } else if (nodeType === 'function') {
                if (keepsTextNodes) {
                    el = document.createTextNode('');
                    getCallback().callbacks.push({ callback: node });
                } else {
                    el = document.createComment('~');
                    getCallback().callbacks.push({
                        callback: function () {
                            var el = document.createTextNode('');
                            domMutate.replaceChild.call(this.parentNode, el, this);
                            return node.apply(el, arguments);
                        }
                    });
                }
            }
            return el;
        }
        function getCallbacks(el, pathData, elementCallbacks) {
            var path = pathData.path, callbacks = pathData.callbacks, paths = pathData.paths, child = el, pathLength = path ? path.length : 0, pathsLength = paths ? paths.length : 0;
            for (var i = 0; i < pathLength; i++) {
                child = child.childNodes.item(path[i]);
            }
            for (i = 0; i < pathsLength; i++) {
                getCallbacks(child, paths[i], elementCallbacks);
            }
            elementCallbacks.push({
                element: child,
                callbacks: callbacks
            });
        }
        function hydrateCallbacks(callbacks, args) {
            var len = callbacks.length, callbacksLength, callbackElement, callbackData;
            for (var i = 0; i < len; i++) {
                callbackData = callbacks[i];
                callbacksLength = callbackData.callbacks.length;
                callbackElement = callbackData.element;
                for (var c = 0; c < callbacksLength; c++) {
                    callbackData.callbacks[c].callback.apply(callbackElement, args);
                }
            }
        }
        function makeTarget(nodes, doc) {
            var paths = [];
            var frag = processNodes(nodes, paths, [], doc || getDocument());
            return {
                paths: paths,
                clone: frag,
                hydrate: function () {
                    var cloned = cloneNode(this.clone);
                    var args = [];
                    for (var a = 0, ref = args.length = arguments.length; a < ref; a++) {
                        args[a] = arguments[a];
                    }
                    var callbacks = [];
                    for (var i = 0; i < paths.length; i++) {
                        getCallbacks(cloned, paths[i], callbacks);
                    }
                    hydrateCallbacks(callbacks, args);
                    return cloned;
                }
            };
        }
        makeTarget.keepsTextNodes = keepsTextNodes;
        makeTarget.cloneNode = cloneNode;
        namespace.view = namespace.view || {};
        module.exports = namespace.view.target = makeTarget;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-queues@1.1.4#queue-state*/
define('can-queues@1.1.4#queue-state', function (require, exports, module) {
    'use strict';
    module.exports = { lastTask: null };
});
/*can-assign@1.3.1#can-assign*/
define('can-assign@1.3.1#can-assign', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    var namespace = require('can-namespace');
    module.exports = namespace.assign = function (d, s) {
        for (var prop in s) {
            var desc = Object.getOwnPropertyDescriptor(d, prop);
            if (!desc || desc.writable !== false) {
                d[prop] = s[prop];
            }
        }
        return d;
    };
});
/*can-queues@1.1.4#queue*/
define('can-queues@1.1.4#queue', [
    'require',
    'exports',
    'module',
    './queue-state',
    'can-log/dev/dev',
    'can-assign'
], function (require, exports, module) {
    'use strict';
    var queueState = require('./queue-state');
    var canDev = require('can-log/dev/dev');
    var assign = require('can-assign');
    function noOperation() {
    }
    var Queue = function (name, callbacks) {
        this.callbacks = assign({
            onFirstTask: noOperation,
            onComplete: function () {
                queueState.lastTask = null;
            }
        }, callbacks || {});
        this.name = name;
        this.index = 0;
        this.tasks = [];
        this._log = false;
    };
    Queue.prototype.constructor = Queue;
    Queue.noop = noOperation;
    Queue.prototype.enqueue = function (fn, context, args, meta) {
        var len = this.tasks.push({
            fn: fn,
            context: context,
            args: args,
            meta: meta || {}
        });
        if (len === 1) {
            this.callbacks.onFirstTask(this);
        }
    };
    Queue.prototype.flush = function () {
        while (this.index < this.tasks.length) {
            var task = this.tasks[this.index++];
            task.fn.apply(task.context, task.args);
        }
        this.index = 0;
        this.tasks = [];
        this.callbacks.onComplete(this);
    };
    Queue.prototype.log = function () {
        this._log = arguments.length ? arguments[0] : true;
    };
    module.exports = Queue;
});
/*can-queues@1.1.4#priority-queue*/
define('can-queues@1.1.4#priority-queue', [
    'require',
    'exports',
    'module',
    './queue'
], function (require, exports, module) {
    'use strict';
    var Queue = require('./queue');
    var PriorityQueue = function () {
        Queue.apply(this, arguments);
        this.taskMap = new Map();
        this.taskContainersByPriority = [];
        this.curPriorityIndex = Infinity;
        this.curPriorityMax = 0;
        this.isFlushing = false;
        this.tasksRemaining = 0;
    };
    PriorityQueue.prototype = Object.create(Queue.prototype);
    PriorityQueue.prototype.constructor = PriorityQueue;
    PriorityQueue.prototype.enqueue = function (fn, context, args, meta) {
        if (!this.taskMap.has(fn)) {
            this.tasksRemaining++;
            var isFirst = this.taskContainersByPriority.length === 0;
            var task = {
                fn: fn,
                context: context,
                args: args,
                meta: meta || {}
            };
            var taskContainer = this.getTaskContainerAndUpdateRange(task);
            taskContainer.tasks.push(task);
            this.taskMap.set(fn, task);
            if (isFirst) {
                this.callbacks.onFirstTask(this);
            }
        }
    };
    PriorityQueue.prototype.getTaskContainerAndUpdateRange = function (task) {
        var priority = task.meta.priority || 0;
        if (priority < this.curPriorityIndex) {
            this.curPriorityIndex = priority;
        }
        if (priority > this.curPriorityMax) {
            this.curPriorityMax = priority;
        }
        var tcByPriority = this.taskContainersByPriority;
        var taskContainer = tcByPriority[priority];
        if (!taskContainer) {
            taskContainer = tcByPriority[priority] = {
                tasks: [],
                index: 0
            };
        }
        return taskContainer;
    };
    PriorityQueue.prototype.flush = function () {
        if (this.isFlushing) {
            return;
        }
        this.isFlushing = true;
        while (true) {
            if (this.curPriorityIndex <= this.curPriorityMax) {
                var taskContainer = this.taskContainersByPriority[this.curPriorityIndex];
                if (taskContainer && taskContainer.tasks.length > taskContainer.index) {
                    var task = taskContainer.tasks[taskContainer.index++];
                    this.tasksRemaining--;
                    this.taskMap['delete'](task.fn);
                    task.fn.apply(task.context, task.args);
                } else {
                    this.curPriorityIndex++;
                }
            } else {
                this.taskMap = new Map();
                this.curPriorityIndex = Infinity;
                this.curPriorityMax = 0;
                this.taskContainersByPriority = [];
                this.isFlushing = false;
                this.callbacks.onComplete(this);
                return;
            }
        }
    };
    PriorityQueue.prototype.isEnqueued = function (fn) {
        return this.taskMap.has(fn);
    };
    PriorityQueue.prototype.flushQueuedTask = function (fn) {
        var task = this.dequeue(fn);
        if (task) {
            task.fn.apply(task.context, task.args);
        }
    };
    PriorityQueue.prototype.dequeue = function (fn) {
        var task = this.taskMap.get(fn);
        if (task) {
            var priority = task.meta.priority || 0;
            var taskContainer = this.taskContainersByPriority[priority];
            var index = taskContainer.tasks.indexOf(task, taskContainer.index);
            if (index >= 0) {
                taskContainer.tasks.splice(index, 1);
                this.tasksRemaining--;
                this.taskMap['delete'](task.fn);
                return task;
            } else {
                console.warn('Task', fn, 'has already run');
            }
        }
    };
    PriorityQueue.prototype.tasksRemainingCount = function () {
        return this.tasksRemaining;
    };
    module.exports = PriorityQueue;
});
/*can-queues@1.1.4#completion-queue*/
define('can-queues@1.1.4#completion-queue', [
    'require',
    'exports',
    'module',
    './queue'
], function (require, exports, module) {
    'use strict';
    var Queue = require('./queue');
    var CompletionQueue = function () {
        Queue.apply(this, arguments);
        this.flushCount = 0;
    };
    CompletionQueue.prototype = Object.create(Queue.prototype);
    CompletionQueue.prototype.constructor = CompletionQueue;
    CompletionQueue.prototype.flush = function () {
        if (this.flushCount === 0) {
            this.flushCount++;
            while (this.index < this.tasks.length) {
                var task = this.tasks[this.index++];
                task.fn.apply(task.context, task.args);
            }
            this.index = 0;
            this.tasks = [];
            this.flushCount--;
            this.callbacks.onComplete(this);
        }
    };
    module.exports = CompletionQueue;
});
/*can-queues@1.1.4#can-queues*/
define('can-queues@1.1.4#can-queues', [
    'require',
    'exports',
    'module',
    'can-log/dev/dev',
    './queue',
    './priority-queue',
    './queue-state',
    './completion-queue',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var canDev = require('can-log/dev/dev');
    var Queue = require('./queue');
    var PriorityQueue = require('./priority-queue');
    var queueState = require('./queue-state');
    var CompletionQueue = require('./completion-queue');
    var ns = require('can-namespace');
    var batchStartCounter = 0;
    var addedTask = false;
    var isFlushing = false;
    var batchNum = 0;
    var batchData;
    var queueNames = [
        'notify',
        'derive',
        'domUI',
        'mutate'
    ];
    var NOTIFY_QUEUE, DERIVE_QUEUE, DOM_UI_QUEUE, MUTATE_QUEUE;
    NOTIFY_QUEUE = new Queue('NOTIFY', {
        onComplete: function () {
            DERIVE_QUEUE.flush();
        },
        onFirstTask: function () {
            if (!batchStartCounter) {
                NOTIFY_QUEUE.flush();
            } else {
                addedTask = true;
            }
        }
    });
    DERIVE_QUEUE = new PriorityQueue('DERIVE', {
        onComplete: function () {
            DOM_UI_QUEUE.flush();
        },
        onFirstTask: function () {
            addedTask = true;
        }
    });
    DOM_UI_QUEUE = new CompletionQueue('DOM_UI', {
        onComplete: function () {
            MUTATE_QUEUE.flush();
        },
        onFirstTask: function () {
            addedTask = true;
        }
    });
    MUTATE_QUEUE = new Queue('MUTATE', {
        onComplete: function () {
            queueState.lastTask = null;
            isFlushing = false;
        },
        onFirstTask: function () {
            addedTask = true;
        }
    });
    var queues = {
        Queue: Queue,
        PriorityQueue: PriorityQueue,
        CompletionQueue: CompletionQueue,
        notifyQueue: NOTIFY_QUEUE,
        deriveQueue: DERIVE_QUEUE,
        domUIQueue: DOM_UI_QUEUE,
        mutateQueue: MUTATE_QUEUE,
        batch: {
            start: function () {
                batchStartCounter++;
                if (batchStartCounter === 1) {
                    batchNum++;
                    batchData = { number: batchNum };
                }
            },
            stop: function () {
                batchStartCounter--;
                if (batchStartCounter === 0) {
                    if (addedTask) {
                        addedTask = false;
                        isFlushing = true;
                        NOTIFY_QUEUE.flush();
                    }
                }
            },
            isCollecting: function () {
                return batchStartCounter > 0;
            },
            number: function () {
                return batchNum;
            },
            data: function () {
                return batchData;
            }
        },
        enqueueByQueue: function enqueueByQueue(fnByQueue, context, args, makeMeta, reasonLog) {
            if (fnByQueue) {
                queues.batch.start();
                queueNames.forEach(function (queueName) {
                    var name = queueName + 'Queue';
                    var QUEUE = queues[name];
                    var tasks = fnByQueue[queueName];
                    if (tasks !== undefined) {
                        tasks.forEach(function (fn) {
                            var meta = makeMeta != null ? makeMeta(fn, context, args) : {};
                            meta.reasonLog = reasonLog;
                            QUEUE.enqueue(fn, context, args, meta);
                        });
                    }
                });
                queues.batch.stop();
            }
        },
        stack: function () {
            var current = queueState.lastTask;
            var stack = [];
            while (current) {
                stack.unshift(current);
                current = current.meta.parentTask;
            }
            return stack;
        },
        logStack: function () {
            var stack = this.stack();
            stack.forEach(function (task, i) {
                var meta = task.meta;
                if (i === 0 && meta && meta.reasonLog) {
                    canDev.log.apply(canDev, meta.reasonLog);
                }
                var log = meta && meta.log ? meta.log : [
                    task.fn.name,
                    task
                ];
                canDev.log.apply(canDev, [task.meta.stack.name + ' ran task:'].concat(log));
            });
        },
        taskCount: function () {
            return NOTIFY_QUEUE.tasks.length + DERIVE_QUEUE.tasks.length + DOM_UI_QUEUE.tasks.length + MUTATE_QUEUE.tasks.length;
        },
        flush: function () {
            NOTIFY_QUEUE.flush();
        },
        log: function () {
            NOTIFY_QUEUE.log.apply(NOTIFY_QUEUE, arguments);
            DERIVE_QUEUE.log.apply(DERIVE_QUEUE, arguments);
            DOM_UI_QUEUE.log.apply(DOM_UI_QUEUE, arguments);
            MUTATE_QUEUE.log.apply(MUTATE_QUEUE, arguments);
        }
    };
    if (ns.queues) {
        throw new Error('You can\'t have two versions of can-queues, check your dependencies');
    } else {
        module.exports = ns.queues = queues;
    }
});
/*can-key-tree@1.2.0#can-key-tree*/
define('can-key-tree@1.2.0#can-key-tree', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var reflect = require('can-reflect');
    function isBuiltInPrototype(obj) {
        if (obj === Object.prototype) {
            return true;
        }
        var protoString = Object.prototype.toString.call(obj);
        var isNotObjObj = protoString !== '[object Object]';
        var isObjSomething = protoString.indexOf('[object ') !== -1;
        return isNotObjObj && isObjSomething;
    }
    function getDeepSize(root, level) {
        if (level === 0) {
            return reflect.size(root);
        } else if (reflect.size(root) === 0) {
            return 0;
        } else {
            var count = 0;
            reflect.each(root, function (value) {
                count += getDeepSize(value, level - 1);
            });
            return count;
        }
    }
    function getDeep(node, items, depth, maxDepth) {
        if (!node) {
            return;
        }
        if (maxDepth === depth) {
            if (reflect.isMoreListLikeThanMapLike(node)) {
                reflect.addValues(items, reflect.toArray(node));
            } else {
                throw new Error('can-key-tree: Map-type leaf containers are not supported yet.');
            }
        } else {
            reflect.each(node, function (value) {
                getDeep(value, items, depth + 1, maxDepth);
            });
        }
    }
    function clearDeep(node, keys, maxDepth, deleteHandler) {
        if (maxDepth === keys.length) {
            if (reflect.isMoreListLikeThanMapLike(node)) {
                var valuesToRemove = reflect.toArray(node);
                if (deleteHandler) {
                    valuesToRemove.forEach(function (value) {
                        deleteHandler.apply(null, keys.concat(value));
                    });
                }
                reflect.removeValues(node, valuesToRemove);
            } else {
                throw new Error('can-key-tree: Map-type leaf containers are not supported yet.');
            }
        } else {
            reflect.each(node, function (value, key) {
                clearDeep(value, keys.concat(key), maxDepth, deleteHandler);
                reflect.deleteKeyValue(node, key);
            });
        }
    }
    var KeyTree = function (treeStructure, callbacks) {
        var FirstConstructor = treeStructure[0];
        if (reflect.isConstructorLike(FirstConstructor)) {
            this.root = new FirstConstructor();
        } else {
            this.root = FirstConstructor;
        }
        this.callbacks = callbacks || {};
        this.treeStructure = treeStructure;
        this.empty = true;
    };
    reflect.assign(KeyTree.prototype, {
        add: function (keys) {
            if (keys.length > this.treeStructure.length) {
                throw new Error('can-key-tree: Can not add path deeper than tree.');
            }
            var place = this.root;
            var rootWasEmpty = this.empty === true;
            for (var i = 0; i < keys.length - 1; i++) {
                var key = keys[i];
                var childNode = reflect.getKeyValue(place, key);
                if (!childNode) {
                    var Constructor = this.treeStructure[i + 1];
                    if (isBuiltInPrototype(Constructor.prototype)) {
                        childNode = new Constructor();
                    } else {
                        childNode = new Constructor(key);
                    }
                    reflect.setKeyValue(place, key, childNode);
                }
                place = childNode;
            }
            if (reflect.isMoreListLikeThanMapLike(place)) {
                reflect.addValues(place, [keys[keys.length - 1]]);
            } else {
                throw new Error('can-key-tree: Map types are not supported yet.');
            }
            if (rootWasEmpty) {
                this.empty = false;
                if (this.callbacks.onFirst) {
                    this.callbacks.onFirst.call(this);
                }
            }
            return this;
        },
        getNode: function (keys) {
            var node = this.root;
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                node = reflect.getKeyValue(node, key);
                if (!node) {
                    return;
                }
            }
            return node;
        },
        get: function (keys) {
            var node = this.getNode(keys);
            if (this.treeStructure.length === keys.length) {
                return node;
            } else {
                var Type = this.treeStructure[this.treeStructure.length - 1];
                var items = new Type();
                getDeep(node, items, keys.length, this.treeStructure.length - 1);
                return items;
            }
        },
        delete: function (keys, deleteHandler) {
            var parentNode = this.root, path = [this.root], lastKey = keys[keys.length - 1];
            for (var i = 0; i < keys.length - 1; i++) {
                var key = keys[i];
                var childNode = reflect.getKeyValue(parentNode, key);
                if (childNode === undefined) {
                    return false;
                } else {
                    path.push(childNode);
                }
                parentNode = childNode;
            }
            if (!keys.length) {
                clearDeep(parentNode, [], this.treeStructure.length - 1, deleteHandler);
            } else if (keys.length === this.treeStructure.length) {
                if (reflect.isMoreListLikeThanMapLike(parentNode)) {
                    if (deleteHandler) {
                        deleteHandler.apply(null, keys.concat(lastKey));
                    }
                    reflect.removeValues(parentNode, [lastKey]);
                } else {
                    throw new Error('can-key-tree: Map types are not supported yet.');
                }
            } else {
                var nodeToRemove = reflect.getKeyValue(parentNode, lastKey);
                if (nodeToRemove !== undefined) {
                    clearDeep(nodeToRemove, keys, this.treeStructure.length - 1, deleteHandler);
                    reflect.deleteKeyValue(parentNode, lastKey);
                } else {
                    return false;
                }
            }
            for (i = path.length - 2; i >= 0; i--) {
                if (reflect.size(parentNode) === 0) {
                    parentNode = path[i];
                    reflect.deleteKeyValue(parentNode, keys[i]);
                } else {
                    break;
                }
            }
            if (reflect.size(this.root) === 0) {
                this.empty = true;
                if (this.callbacks.onEmpty) {
                    this.callbacks.onEmpty.call(this);
                }
            }
            return true;
        },
        size: function () {
            return getDeepSize(this.root, this.treeStructure.length - 1);
        },
        isEmpty: function () {
            return this.empty;
        }
    });
    module.exports = KeyTree;
});
/*can-reflect-promise@2.2.0#can-reflect-promise*/
define('can-reflect-promise@2.2.0#can-reflect-promise', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-symbol',
    'can-observation-recorder',
    'can-queues',
    'can-key-tree',
    'can-log/dev/dev'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var ObservationRecorder = require('can-observation-recorder');
    var queues = require('can-queues');
    var KeyTree = require('can-key-tree');
    var dev = require('can-log/dev/dev');
    var getKeyValueSymbol = canSymbol.for('can.getKeyValue'), observeDataSymbol = canSymbol.for('can.meta');
    var promiseDataPrototype = {
        isPending: true,
        state: 'pending',
        isResolved: false,
        isRejected: false,
        value: undefined,
        reason: undefined
    };
    function setVirtualProp(promise, property, value) {
        var observeData = promise[observeDataSymbol];
        var old = observeData[property];
        observeData[property] = value;
        queues.enqueueByQueue(observeData.handlers.getNode([property]), promise, [
            value,
            old
        ], function () {
            return {};
        }, [
            'Promise',
            promise,
            'resolved with value',
            value,
            'and changed virtual property: ' + property
        ]);
    }
    function initPromise(promise) {
        var observeData = promise[observeDataSymbol];
        if (!observeData) {
            Object.defineProperty(promise, observeDataSymbol, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: Object.create(promiseDataPrototype)
            });
            observeData = promise[observeDataSymbol];
            observeData.handlers = new KeyTree([
                Object,
                Object,
                Array
            ]);
        }
        promise.then(function (value) {
            queues.batch.start();
            setVirtualProp(promise, 'isPending', false);
            setVirtualProp(promise, 'isResolved', true);
            setVirtualProp(promise, 'value', value);
            setVirtualProp(promise, 'state', 'resolved');
            queues.batch.stop();
        }, function (reason) {
            queues.batch.start();
            setVirtualProp(promise, 'isPending', false);
            setVirtualProp(promise, 'isRejected', true);
            setVirtualProp(promise, 'reason', reason);
            setVirtualProp(promise, 'state', 'rejected');
            queues.batch.stop();
        });
    }
    function setupPromise(value) {
        var oldPromiseFn;
        var proto = 'getPrototypeOf' in Object ? Object.getPrototypeOf(value) : value.__proto__;
        if (value[getKeyValueSymbol] && value[observeDataSymbol]) {
            return;
        }
        if (proto === null || proto === Object.prototype) {
            proto = value;
            if (typeof proto.promise === 'function') {
                oldPromiseFn = proto.promise;
                proto.promise = function () {
                    var result = oldPromiseFn.call(proto);
                    setupPromise(result);
                    return result;
                };
            }
        }
        canReflect.assignSymbols(proto, {
            'can.getKeyValue': function (key) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                ObservationRecorder.add(this, key);
                switch (key) {
                case 'state':
                case 'isPending':
                case 'isResolved':
                case 'isRejected':
                case 'value':
                case 'reason':
                    return this[observeDataSymbol][key];
                default:
                    return this[key];
                }
            },
            'can.getValue': function () {
                return this[getKeyValueSymbol]('value');
            },
            'can.isValueLike': false,
            'can.onKeyValue': function (key, handler, queue) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                this[observeDataSymbol].handlers.add([
                    key,
                    queue || 'mutate',
                    handler
                ]);
            },
            'can.offKeyValue': function (key, handler, queue) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                this[observeDataSymbol].handlers.delete([
                    key,
                    queue || 'mutate',
                    handler
                ]);
            },
            'can.hasOwnKey': function (key) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                return key in this[observeDataSymbol];
            }
        });
    }
    module.exports = setupPromise;
});
/*can-stache-key@1.4.0#can-stache-key*/
define('can-stache-key@1.4.0#can-stache-key', [
    'require',
    'exports',
    'module',
    'can-observation-recorder',
    'can-log/dev/dev',
    'can-symbol',
    'can-reflect',
    'can-reflect-promise'
], function (require, exports, module) {
    'use strict';
    var ObservationRecorder = require('can-observation-recorder');
    var dev = require('can-log/dev/dev');
    var canSymbol = require('can-symbol');
    var canReflect = require('can-reflect');
    var canReflectPromise = require('can-reflect-promise');
    var getValueSymbol = canSymbol.for('can.getValue');
    var setValueSymbol = canSymbol.for('can.setValue');
    var isValueLikeSymbol = canSymbol.for('can.isValueLike');
    var peek = ObservationRecorder.ignore(canReflect.getKeyValue.bind(canReflect));
    var observeReader;
    var bindName = Function.prototype.bind;
    var isAt = function (index, reads) {
        var prevRead = reads[index - 1];
        return prevRead && prevRead.at;
    };
    var readValue = function (value, index, reads, options, state, prev) {
        var usedValueReader;
        do {
            usedValueReader = false;
            for (var i = 0, len = observeReader.valueReaders.length; i < len; i++) {
                if (observeReader.valueReaders[i].test(value, index, reads, options)) {
                    value = observeReader.valueReaders[i].read(value, index, reads, options, state, prev);
                }
            }
        } while (usedValueReader);
        return value;
    };
    var specialRead = {
        index: true,
        key: true,
        event: true,
        element: true,
        viewModel: true
    };
    var checkForObservableAndNotify = function (options, state, getObserves, value, index) {
        if (options.foundObservable && !state.foundObservable) {
            if (ObservationRecorder.trapsCount()) {
                ObservationRecorder.addMany(getObserves());
                options.foundObservable(value, index);
                state.foundObservable = true;
            }
        }
    };
    var objHasKeyAtIndex = function (obj, reads, index) {
        return !!(reads && reads.length && canReflect.hasKey(obj, reads[index].key));
    };
    observeReader = {
        read: function (parent, reads, options) {
            options = options || {};
            var state = { foundObservable: false };
            var getObserves;
            if (options.foundObservable) {
                getObserves = ObservationRecorder.trap();
            }
            var cur = readValue(parent, 0, reads, options, state), type, prev, readLength = reads.length, i = 0, last, parentHasKey;
            checkForObservableAndNotify(options, state, getObserves, parent, 0);
            while (i < readLength) {
                prev = cur;
                for (var r = 0, readersLength = observeReader.propertyReaders.length; r < readersLength; r++) {
                    var reader = observeReader.propertyReaders[r];
                    if (reader.test(cur)) {
                        cur = reader.read(cur, reads[i], i, options, state);
                        break;
                    }
                }
                checkForObservableAndNotify(options, state, getObserves, prev, i);
                last = cur;
                i = i + 1;
                cur = readValue(cur, i, reads, options, state, prev);
                checkForObservableAndNotify(options, state, getObserves, prev, i - 1);
                type = typeof cur;
                if (i < reads.length && (cur === null || cur === undefined)) {
                    parentHasKey = objHasKeyAtIndex(prev, reads, i - 1);
                    if (options.earlyExit && !parentHasKey) {
                        options.earlyExit(prev, i - 1, cur);
                    }
                    return {
                        value: undefined,
                        parent: prev,
                        parentHasKey: parentHasKey,
                        foundLastParent: false
                    };
                }
            }
            parentHasKey = objHasKeyAtIndex(prev, reads, reads.length - 1);
            if (cur === undefined && !parentHasKey) {
                if (options.earlyExit) {
                    options.earlyExit(prev, i - 1);
                }
            }
            return {
                value: cur,
                parent: prev,
                parentHasKey: parentHasKey,
                foundLastParent: true
            };
        },
        get: function (parent, reads, options) {
            return observeReader.read(parent, observeReader.reads(reads), options || {}).value;
        },
        valueReadersMap: {},
        valueReaders: [
            {
                name: 'function',
                test: function (value) {
                    return value && canReflect.isFunctionLike(value) && !canReflect.isConstructorLike(value);
                },
                read: function (value, i, reads, options, state, prev) {
                    if (options.callMethodsOnObservables && canReflect.isObservableLike(prev) && canReflect.isMapLike(prev)) {
                        dev.warn('can-stache-key: read() called with `callMethodsOnObservables: true`.');
                        return value.apply(prev, options.args || []);
                    }
                    return options.proxyMethods !== false ? bindName.call(value, prev) : value;
                }
            },
            {
                name: 'isValueLike',
                test: function (value, i, reads, options) {
                    return value && value[getValueSymbol] && value[isValueLikeSymbol] !== false && (options.foundAt || !isAt(i, reads));
                },
                read: function (value, i, reads, options) {
                    if (options.readCompute === false && i === reads.length) {
                        return value;
                    }
                    return canReflect.getValue(value);
                },
                write: function (base, newVal) {
                    if (base[setValueSymbol]) {
                        base[setValueSymbol](newVal);
                    } else if (base.set) {
                        base.set(newVal);
                    } else {
                        base(newVal);
                    }
                }
            }
        ],
        propertyReadersMap: {},
        propertyReaders: [
            {
                name: 'map',
                test: function (value) {
                    if (canReflect.isPromise(value) || typeof value === 'object' && value && typeof value.then === 'function') {
                        canReflectPromise(value);
                    }
                    return canReflect.isObservableLike(value) && canReflect.isMapLike(value);
                },
                read: function (value, prop) {
                    var res = canReflect.getKeyValue(value, prop.key);
                    if (res !== undefined) {
                        return res;
                    } else {
                        return value[prop.key];
                    }
                },
                write: canReflect.setKeyValue
            },
            {
                name: 'object',
                test: function () {
                    return true;
                },
                read: function (value, prop, i, options) {
                    if (value == null) {
                        return undefined;
                    } else {
                        if (typeof value === 'object') {
                            if (prop.key in value) {
                                return value[prop.key];
                            }
                        } else {
                            return value[prop.key];
                        }
                    }
                },
                write: function (base, prop, newVal) {
                    var propValue = base[prop];
                    if (newVal != null && typeof newVal === 'object' && canReflect.isMapLike(propValue)) {
                        dev.warn('can-stache-key: Merging data into "' + prop + '" because its parent is non-observable');
                        canReflect.update(propValue, newVal);
                    } else if (propValue != null && propValue[setValueSymbol] !== undefined) {
                        canReflect.setValue(propValue, newVal);
                    } else {
                        base[prop] = newVal;
                    }
                }
            }
        ],
        reads: function (keyArg) {
            var key = '' + keyArg;
            var keys = [];
            var last = 0;
            var at = false;
            if (key.charAt(0) === '@') {
                last = 1;
                at = true;
            }
            var keyToAdd = '';
            for (var i = last; i < key.length; i++) {
                var character = key.charAt(i);
                if (character === '.' || character === '@') {
                    if (key.charAt(i - 1) !== '\\') {
                        keys.push({
                            key: keyToAdd,
                            at: at
                        });
                        at = character === '@';
                        keyToAdd = '';
                    } else {
                        keyToAdd = keyToAdd.substr(0, keyToAdd.length - 1) + '.';
                    }
                } else {
                    keyToAdd += character;
                }
            }
            keys.push({
                key: keyToAdd,
                at: at
            });
            return keys;
        },
        write: function (parent, key, value, options) {
            var keys = typeof key === 'string' ? observeReader.reads(key) : key;
            var last;
            options = options || {};
            if (keys.length > 1) {
                last = keys.pop();
                parent = observeReader.read(parent, keys, options).value;
                keys.push(last);
            } else {
                last = keys[0];
            }
            if (!parent) {
                return;
            }
            var keyValue = peek(parent, last.key);
            if (observeReader.valueReadersMap.isValueLike.test(keyValue, keys.length - 1, keys, options)) {
                observeReader.valueReadersMap.isValueLike.write(keyValue, value, options);
            } else {
                if (observeReader.valueReadersMap.isValueLike.test(parent, keys.length - 1, keys, options)) {
                    parent = parent[getValueSymbol]();
                }
                if (observeReader.propertyReadersMap.map.test(parent)) {
                    observeReader.propertyReadersMap.map.write(parent, last.key, value, options);
                } else if (observeReader.propertyReadersMap.object.test(parent)) {
                    observeReader.propertyReadersMap.object.write(parent, last.key, value, options);
                    if (options.observation) {
                        options.observation.update();
                    }
                }
            }
        }
    };
    observeReader.propertyReaders.forEach(function (reader) {
        observeReader.propertyReadersMap[reader.name] = reader;
    });
    observeReader.valueReaders.forEach(function (reader) {
        observeReader.valueReadersMap[reader.name] = reader;
    });
    observeReader.set = observeReader.write;
    module.exports = observeReader;
});
/*can-string@1.0.0#can-string*/
define('can-string@1.0.0#can-string', function (require, exports, module) {
    'use strict';
    var strUndHash = /_|-/, strColons = /\=\=/, strWords = /([A-Z]+)([A-Z][a-z])/g, strLowUp = /([a-z\d])([A-Z])/g, strDash = /([a-z\d])([A-Z])/g, strQuote = /"/g, strSingleQuote = /'/g, strHyphenMatch = /-+(.)?/g, strCamelMatch = /[a-z][A-Z]/g, convertBadValues = function (content) {
            var isInvalid = content === null || content === undefined || isNaN(content) && '' + content === 'NaN';
            return '' + (isInvalid ? '' : content);
        };
    var string = {
        esc: function (content) {
            return convertBadValues(content).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(strQuote, '&#34;').replace(strSingleQuote, '&#39;');
        },
        capitalize: function (s) {
            return s.charAt(0).toUpperCase() + s.slice(1);
        },
        camelize: function (str) {
            return convertBadValues(str).replace(strHyphenMatch, function (match, chr) {
                return chr ? chr.toUpperCase() : '';
            });
        },
        hyphenate: function (str) {
            return convertBadValues(str).replace(strCamelMatch, function (str) {
                return str.charAt(0) + '-' + str.charAt(1).toLowerCase();
            });
        },
        underscore: function (s) {
            return s.replace(strColons, '/').replace(strWords, '$1_$2').replace(strLowUp, '$1_$2').replace(strDash, '_').toLowerCase();
        },
        undHash: strUndHash
    };
    module.exports = string;
});
/*can-construct@3.5.3#can-construct*/
define('can-construct@3.5.3#can-construct', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-log/dev/dev',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var dev = require('can-log/dev/dev');
    var namespace = require('can-namespace');
    var initializing = 0;
    var Construct = function () {
        if (arguments.length) {
            return Construct.extend.apply(Construct, arguments);
        }
    };
    var canGetDescriptor;
    try {
        Object.getOwnPropertyDescriptor({});
        canGetDescriptor = true;
    } catch (e) {
        canGetDescriptor = false;
    }
    var getDescriptor = function (newProps, name) {
            var descriptor = Object.getOwnPropertyDescriptor(newProps, name);
            if (descriptor && (descriptor.get || descriptor.set)) {
                return descriptor;
            }
            return null;
        }, inheritGetterSetter = function (newProps, oldProps, addTo) {
            addTo = addTo || newProps;
            var descriptor;
            for (var name in newProps) {
                if (descriptor = getDescriptor(newProps, name)) {
                    this._defineProperty(addTo, oldProps, name, descriptor);
                } else {
                    Construct._overwrite(addTo, oldProps, name, newProps[name]);
                }
            }
        }, simpleInherit = function (newProps, oldProps, addTo) {
            addTo = addTo || newProps;
            for (var name in newProps) {
                Construct._overwrite(addTo, oldProps, name, newProps[name]);
            }
        }, defineNonEnumerable = function (obj, prop, value) {
            Object.defineProperty(obj, prop, {
                configurable: true,
                writable: true,
                enumerable: false,
                value: value
            });
        };
    canReflect.assignMap(Construct, {
        constructorExtends: true,
        newInstance: function () {
            var inst = this.instance(), args;
            if (inst.setup) {
                Object.defineProperty(inst, '__inSetup', {
                    configurable: true,
                    enumerable: false,
                    value: true,
                    writable: true
                });
                args = inst.setup.apply(inst, arguments);
                if (args instanceof Construct.ReturnValue) {
                    return args.value;
                }
                inst.__inSetup = false;
            }
            if (inst.init) {
                inst.init.apply(inst, args || arguments);
            }
            return inst;
        },
        _inherit: canGetDescriptor ? inheritGetterSetter : simpleInherit,
        _defineProperty: function (what, oldProps, propName, descriptor) {
            Object.defineProperty(what, propName, descriptor);
        },
        _overwrite: function (what, oldProps, propName, val) {
            Object.defineProperty(what, propName, {
                value: val,
                configurable: true,
                enumerable: true,
                writable: true
            });
        },
        setup: function (base) {
            var defaults = canReflect.assignDeepMap({}, base.defaults);
            this.defaults = canReflect.assignDeepMap(defaults, this.defaults);
        },
        instance: function () {
            initializing = 1;
            var inst = new this();
            initializing = 0;
            return inst;
        },
        extend: function (name, staticProperties, instanceProperties) {
            var shortName = name, klass = staticProperties, proto = instanceProperties;
            if (typeof shortName !== 'string') {
                proto = klass;
                klass = shortName;
                shortName = null;
            }
            if (!proto) {
                proto = klass;
                klass = null;
            }
            proto = proto || {};
            var _super_class = this, _super = this.prototype, Constructor, prototype;
            prototype = this.instance();
            Construct._inherit(proto, _super, prototype);
            if (shortName) {
            } else if (klass && klass.shortName) {
                shortName = klass.shortName;
            } else if (this.shortName) {
                shortName = this.shortName;
            }
            function init() {
                if (!initializing) {
                    return (!this || this.constructor !== Constructor) && arguments.length && Constructor.constructorExtends ? Constructor.extend.apply(Constructor, arguments) : Constructor.newInstance.apply(Constructor, arguments);
                }
            }
            Constructor = typeof namedCtor === 'function' ? namedCtor(constructorName, init) : function () {
                return init.apply(this, arguments);
            };
            for (var propName in _super_class) {
                if (_super_class.hasOwnProperty(propName)) {
                    Constructor[propName] = _super_class[propName];
                }
            }
            Construct._inherit(klass, _super_class, Constructor);
            canReflect.assignMap(Constructor, {
                constructor: Constructor,
                prototype: prototype
            });
            if (shortName !== undefined) {
                if (Object.getOwnPropertyDescriptor) {
                    var desc = Object.getOwnPropertyDescriptor(Constructor, 'name');
                    if (!desc || desc.configurable) {
                        Object.defineProperty(Constructor, 'name', {
                            writable: true,
                            value: shortName,
                            configurable: true
                        });
                    }
                }
                Constructor.shortName = shortName;
            }
            defineNonEnumerable(Constructor.prototype, 'constructor', Constructor);
            var t = [_super_class].concat(Array.prototype.slice.call(arguments)), args = Constructor.setup.apply(Constructor, t);
            if (Constructor.init) {
                Constructor.init.apply(Constructor, args || t);
            }
            return Constructor;
        },
        ReturnValue: function (value) {
            this.value = value;
        }
    });
    defineNonEnumerable(Construct.prototype, 'setup', function () {
    });
    defineNonEnumerable(Construct.prototype, 'init', function () {
    });
    module.exports = namespace.Construct = Construct;
});
/*can-dom-events@1.3.2#helpers/util*/
define('can-dom-events@1.3.2#helpers/util', [
    'require',
    'exports',
    'module',
    'can-globals/document/document',
    'can-globals/is-browser-window/is-browser-window'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getCurrentDocument = require('can-globals/document/document');
        var isBrowserWindow = require('can-globals/is-browser-window/is-browser-window');
        function getTargetDocument(target) {
            return target.ownerDocument || getCurrentDocument();
        }
        function createEvent(target, eventData, bubbles, cancelable) {
            var doc = getTargetDocument(target);
            var event = doc.createEvent('HTMLEvents');
            var eventType;
            if (typeof eventData === 'string') {
                eventType = eventData;
            } else {
                eventType = eventData.type;
                for (var prop in eventData) {
                    if (event[prop] === undefined) {
                        event[prop] = eventData[prop];
                    }
                }
            }
            if (bubbles === undefined) {
                bubbles = true;
            }
            event.initEvent(eventType, bubbles, cancelable);
            return event;
        }
        function isDomEventTarget(obj) {
            if (!(obj && obj.nodeName)) {
                return obj === window;
            }
            var nodeType = obj.nodeType;
            return nodeType === 1 || nodeType === 9 || nodeType === 11;
        }
        function addDomContext(context, args) {
            if (isDomEventTarget(context)) {
                args = Array.prototype.slice.call(args, 0);
                args.unshift(context);
            }
            return args;
        }
        function removeDomContext(context, args) {
            if (!isDomEventTarget(context)) {
                args = Array.prototype.slice.call(args, 0);
                context = args.shift();
            }
            return {
                context: context,
                args: args
            };
        }
        var fixSyntheticEventsOnDisabled = false;
        (function () {
            if (!isBrowserWindow()) {
                return;
            }
            var testEventName = 'fix_synthetic_events_on_disabled_test';
            var input = document.createElement('input');
            input.disabled = true;
            var timer = setTimeout(function () {
                fixSyntheticEventsOnDisabled = true;
            }, 50);
            var onTest = function onTest() {
                clearTimeout(timer);
                input.removeEventListener(testEventName, onTest);
            };
            input.addEventListener(testEventName, onTest);
            try {
                var event = document.create('HTMLEvents');
                event.initEvent(testEventName, false);
                input.dispatchEvent(event);
            } catch (e) {
                onTest();
                fixSyntheticEventsOnDisabled = true;
            }
        }());
        function isDispatchingOnDisabled(element, event) {
            var eventType = event.type;
            var isInsertedOrRemoved = eventType === 'inserted' || eventType === 'removed';
            var isDisabled = !!element.disabled;
            return isInsertedOrRemoved && isDisabled;
        }
        function forceEnabledForDispatch(element, event) {
            return fixSyntheticEventsOnDisabled && isDispatchingOnDisabled(element, event);
        }
        module.exports = {
            createEvent: createEvent,
            addDomContext: addDomContext,
            removeDomContext: removeDomContext,
            isDomEventTarget: isDomEventTarget,
            getTargetDocument: getTargetDocument,
            forceEnabledForDispatch: forceEnabledForDispatch
        };
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-dom-events@1.3.2#helpers/make-event-registry*/
define('can-dom-events@1.3.2#helpers/make-event-registry', function (require, exports, module) {
    'use strict';
    function EventRegistry() {
        this._registry = {};
    }
    module.exports = function makeEventRegistry() {
        return new EventRegistry();
    };
    EventRegistry.prototype.has = function (eventType) {
        return !!this._registry[eventType];
    };
    EventRegistry.prototype.get = function (eventType) {
        return this._registry[eventType];
    };
    EventRegistry.prototype.add = function (event, eventType) {
        if (!event) {
            throw new Error('An EventDefinition must be provided');
        }
        if (typeof event.addEventListener !== 'function') {
            throw new TypeError('EventDefinition addEventListener must be a function');
        }
        if (typeof event.removeEventListener !== 'function') {
            throw new TypeError('EventDefinition removeEventListener must be a function');
        }
        eventType = eventType || event.defaultEventType;
        if (typeof eventType !== 'string') {
            throw new TypeError('Event type must be a string, not ' + eventType);
        }
        if (this.has(eventType)) {
            throw new Error('Event "' + eventType + '" is already registered');
        }
        this._registry[eventType] = event;
        var self = this;
        return function remove() {
            self._registry[eventType] = undefined;
        };
    };
});
/*can-dom-events@1.3.2#helpers/-make-delegate-event-tree*/
define('can-dom-events@1.3.2#helpers/-make-delegate-event-tree', [
    'require',
    'exports',
    'module',
    'can-key-tree',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var KeyTree = require('can-key-tree');
    var canReflect = require('can-reflect');
    var useCapture = function (eventType) {
        return eventType === 'focus' || eventType === 'blur';
    };
    function makeDelegator(domEvents) {
        var Delegator = function Delegator(parentKey) {
            this.element = parentKey;
            this.events = {};
            this.delegated = {};
        };
        canReflect.assignSymbols(Delegator.prototype, {
            'can.setKeyValue': function (eventType, handlersBySelector) {
                var handler = this.delegated[eventType] = function (ev) {
                    canReflect.each(handlersBySelector, function (handlers, selector) {
                        var cur = ev.target;
                        do {
                            var el = cur === document ? document.documentElement : cur;
                            var matches = el.matches || el.msMatchesSelector;
                            if (matches.call(el, selector)) {
                                handlers.forEach(function (handler) {
                                    handler.call(el, ev);
                                });
                            }
                            cur = cur.parentNode;
                        } while (cur && cur !== ev.currentTarget);
                    });
                };
                this.events[eventType] = handlersBySelector;
                domEvents.addEventListener(this.element, eventType, handler, useCapture(eventType));
            },
            'can.getKeyValue': function (eventType) {
                return this.events[eventType];
            },
            'can.deleteKeyValue': function (eventType) {
                domEvents.removeEventListener(this.element, eventType, this.delegated[eventType], useCapture(eventType));
                delete this.delegated[eventType];
                delete this.events[eventType];
            },
            'can.getOwnEnumerableKeys': function () {
                return Object.keys(this.events);
            }
        });
        return Delegator;
    }
    module.exports = function makeDelegateEventTree(domEvents) {
        var Delegator = makeDelegator(domEvents);
        return new KeyTree([
            Map,
            Delegator,
            Object,
            Array
        ]);
    };
});
/*can-dom-events@1.3.2#can-dom-events*/
define('can-dom-events@1.3.2#can-dom-events', [
    'require',
    'exports',
    'module',
    'can-namespace',
    './helpers/util',
    './helpers/make-event-registry',
    './helpers/-make-delegate-event-tree'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var namespace = require('can-namespace');
        var util = require('./helpers/util');
        var makeEventRegistry = require('./helpers/make-event-registry');
        var makeDelegateEventTree = require('./helpers/-make-delegate-event-tree');
        var domEvents = {
            _eventRegistry: makeEventRegistry(),
            addEvent: function (event, eventType) {
                return this._eventRegistry.add(event, eventType);
            },
            addEventListener: function (target, eventType) {
                var hasCustomEvent = domEvents._eventRegistry.has(eventType);
                if (hasCustomEvent) {
                    var event = domEvents._eventRegistry.get(eventType);
                    return event.addEventListener.apply(domEvents, arguments);
                }
                var eventArgs = Array.prototype.slice.call(arguments, 1);
                return target.addEventListener.apply(target, eventArgs);
            },
            removeEventListener: function (target, eventType) {
                var hasCustomEvent = domEvents._eventRegistry.has(eventType);
                if (hasCustomEvent) {
                    var event = domEvents._eventRegistry.get(eventType);
                    return event.removeEventListener.apply(domEvents, arguments);
                }
                var eventArgs = Array.prototype.slice.call(arguments, 1);
                return target.removeEventListener.apply(target, eventArgs);
            },
            addDelegateListener: function (root, eventType, selector, handler) {
                domEvents._eventTree.add([
                    root,
                    eventType,
                    selector,
                    handler
                ]);
            },
            removeDelegateListener: function (target, eventType, selector, handler) {
                domEvents._eventTree.delete([
                    target,
                    eventType,
                    selector,
                    handler
                ]);
            },
            dispatch: function (target, eventData, bubbles, cancelable) {
                var event = util.createEvent(target, eventData, bubbles, cancelable);
                var enableForDispatch = util.forceEnabledForDispatch(target, event);
                if (enableForDispatch) {
                    target.disabled = false;
                }
                var ret = target.dispatchEvent(event);
                if (enableForDispatch) {
                    target.disabled = true;
                }
                return ret;
            }
        };
        domEvents._eventTree = makeDelegateEventTree(domEvents);
        module.exports = namespace.domEvents = domEvents;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-event-queue@1.1.3#dependency-record/merge*/
define('can-event-queue@1.1.3#dependency-record/merge', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var mergeValueDependencies = function mergeValueDependencies(obj, source) {
        var sourceValueDeps = source.valueDependencies;
        if (sourceValueDeps) {
            var destValueDeps = obj.valueDependencies;
            if (!destValueDeps) {
                destValueDeps = new Set();
                obj.valueDependencies = destValueDeps;
            }
            canReflect.eachIndex(sourceValueDeps, function (dep) {
                destValueDeps.add(dep);
            });
        }
    };
    var mergeKeyDependencies = function mergeKeyDependencies(obj, source) {
        var sourcekeyDeps = source.keyDependencies;
        if (sourcekeyDeps) {
            var destKeyDeps = obj.keyDependencies;
            if (!destKeyDeps) {
                destKeyDeps = new Map();
                obj.keyDependencies = destKeyDeps;
            }
            canReflect.eachKey(sourcekeyDeps, function (keys, obj) {
                var entry = destKeyDeps.get(obj);
                if (!entry) {
                    entry = new Set();
                    destKeyDeps.set(obj, entry);
                }
                canReflect.eachIndex(keys, function (key) {
                    entry.add(key);
                });
            });
        }
    };
    module.exports = function mergeDependencyRecords(object, source) {
        mergeKeyDependencies(object, source);
        mergeValueDependencies(object, source);
        return object;
    };
});
/*can-event-queue@1.1.3#map/map*/
define('can-event-queue@1.1.3#map/map', [
    'require',
    'exports',
    'module',
    'can-log/dev/dev',
    'can-queues',
    'can-reflect',
    'can-symbol',
    'can-key-tree',
    'can-dom-events',
    'can-dom-events/helpers/util',
    '../dependency-record/merge'
], function (require, exports, module) {
    'use strict';
    var canDev = require('can-log/dev/dev');
    var queues = require('can-queues');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var KeyTree = require('can-key-tree');
    var domEvents = require('can-dom-events');
    var isDomEventTarget = require('can-dom-events/helpers/util').isDomEventTarget;
    var mergeDependencyRecords = require('../dependency-record/merge');
    var metaSymbol = canSymbol.for('can.meta'), dispatchBoundChangeSymbol = canSymbol.for('can.dispatchInstanceBoundChange'), dispatchInstanceOnPatchesSymbol = canSymbol.for('can.dispatchInstanceOnPatches'), onKeyValueSymbol = canSymbol.for('can.onKeyValue'), offKeyValueSymbol = canSymbol.for('can.offKeyValue'), onEventSymbol = canSymbol.for('can.onEvent'), offEventSymbol = canSymbol.for('can.offEvent'), onValueSymbol = canSymbol.for('can.onValue'), offValueSymbol = canSymbol.for('can.offValue');
    var legacyMapBindings;
    function addHandlers(obj, meta) {
        if (!meta.handlers) {
            meta.handlers = new KeyTree([
                Object,
                Object,
                Object,
                Array
            ], {
                onFirst: function () {
                    if (obj._eventSetup !== undefined) {
                        obj._eventSetup();
                    }
                    var constructor = obj.constructor;
                    if (constructor[dispatchBoundChangeSymbol] !== undefined && obj instanceof constructor) {
                        constructor[dispatchBoundChangeSymbol](obj, true);
                    }
                },
                onEmpty: function () {
                    if (obj._eventTeardown !== undefined) {
                        obj._eventTeardown();
                    }
                    var constructor = obj.constructor;
                    if (constructor[dispatchBoundChangeSymbol] !== undefined && obj instanceof constructor) {
                        constructor[dispatchBoundChangeSymbol](obj, false);
                    }
                }
            });
        }
        if (!meta.listenHandlers) {
            meta.listenHandlers = new KeyTree([
                Map,
                Map,
                Object,
                Array
            ]);
        }
    }
    var ensureMeta = function ensureMeta(obj) {
        var meta = obj[metaSymbol];
        if (!meta) {
            meta = {};
            canReflect.setKeyValue(obj, metaSymbol, meta);
        }
        addHandlers(obj, meta);
        return meta;
    };
    function stopListeningArgumentsToKeys(bindTarget, event, handler, queueName) {
        if (arguments.length && canReflect.isPrimitive(bindTarget)) {
            queueName = handler;
            handler = event;
            event = bindTarget;
            bindTarget = this.context;
        }
        if (typeof event === 'function') {
            queueName = handler;
            handler = event;
            event = undefined;
        }
        if (typeof handler === 'string') {
            queueName = handler;
            handler = undefined;
        }
        var keys = [];
        if (bindTarget) {
            keys.push(bindTarget);
            if (event || handler || queueName) {
                keys.push(event);
                if (queueName || handler) {
                    keys.push(queueName || this.defaultQueue);
                    if (handler) {
                        keys.push(handler);
                    }
                }
            }
        }
        return keys;
    }
    var props = {
        dispatch: function (event, args) {
            if (!this.__inSetup) {
                if (typeof event === 'string') {
                    event = { type: event };
                }
                var meta = ensureMeta(this);
                var handlers = meta.handlers;
                var handlersByType = event.type !== undefined && handlers.getNode([event.type]);
                var dispatchConstructorPatches = event.patches && this.constructor[dispatchInstanceOnPatchesSymbol];
                var patchesNode = event.patches !== undefined && handlers.getNode([
                    'can.patches',
                    'onKeyValue'
                ]);
                var keysNode = event.keyChanged !== undefined && handlers.getNode([
                    'can.keys',
                    'onKeyValue'
                ]);
                var batch = dispatchConstructorPatches || handlersByType || patchesNode || keysNode;
                if (batch) {
                    queues.batch.start();
                }
                if (handlersByType) {
                    if (handlersByType.onKeyValue) {
                        queues.enqueueByQueue(handlersByType.onKeyValue, this, args, event.makeMeta, event.reasonLog);
                    }
                    if (handlersByType.event) {
                        event.batchNum = queues.batch.number();
                        var eventAndArgs = [event].concat(args);
                        queues.enqueueByQueue(handlersByType.event, this, eventAndArgs, event.makeMeta, event.reasonLog);
                    }
                }
                if (keysNode) {
                    queues.enqueueByQueue(keysNode, this, [event.keyChanged], event.makeMeta, event.reasonLog);
                }
                if (patchesNode) {
                    queues.enqueueByQueue(patchesNode, this, [event.patches], event.makeMeta, event.reasonLog);
                }
                if (dispatchConstructorPatches) {
                    this.constructor[dispatchInstanceOnPatchesSymbol](this, event.patches);
                }
                if (batch) {
                    queues.batch.stop();
                }
            }
            return event;
        },
        addEventListener: function (key, handler, queueName) {
            ensureMeta(this).handlers.add([
                key,
                'event',
                queueName || 'mutate',
                handler
            ]);
            return this;
        },
        removeEventListener: function (key, handler, queueName) {
            if (key === undefined) {
                var handlers = ensureMeta(this).handlers;
                var keyHandlers = handlers.getNode([]);
                Object.keys(keyHandlers).forEach(function (key) {
                    handlers.delete([
                        key,
                        'event'
                    ]);
                });
            } else if (!handler && !queueName) {
                ensureMeta(this).handlers.delete([
                    key,
                    'event'
                ]);
            } else if (!handler) {
                ensureMeta(this).handlers.delete([
                    key,
                    'event',
                    queueName || 'mutate'
                ]);
            } else {
                ensureMeta(this).handlers.delete([
                    key,
                    'event',
                    queueName || 'mutate',
                    handler
                ]);
            }
            return this;
        },
        one: function (event, handler) {
            var one = function () {
                legacyMapBindings.off.call(this, event, one);
                return handler.apply(this, arguments);
            };
            legacyMapBindings.on.call(this, event, one);
            return this;
        },
        listenTo: function (bindTarget, event, handler, queueName) {
            if (canReflect.isPrimitive(bindTarget)) {
                queueName = handler;
                handler = event;
                event = bindTarget;
                bindTarget = this;
            }
            if (typeof event === 'function') {
                queueName = handler;
                handler = event;
                event = undefined;
            }
            ensureMeta(this).listenHandlers.add([
                bindTarget,
                event,
                queueName || 'mutate',
                handler
            ]);
            legacyMapBindings.on.call(bindTarget, event, handler, queueName || 'mutate');
            return this;
        },
        stopListening: function () {
            var keys = stopListeningArgumentsToKeys.apply({
                context: this,
                defaultQueue: 'mutate'
            }, arguments);
            var listenHandlers = ensureMeta(this).listenHandlers;
            function deleteHandler(bindTarget, event, queue, handler) {
                legacyMapBindings.off.call(bindTarget, event, handler, queue);
            }
            listenHandlers.delete(keys, deleteHandler);
            return this;
        },
        on: function (eventName, handler, queue) {
            var listenWithDOM = isDomEventTarget(this);
            if (listenWithDOM) {
                if (typeof handler === 'string') {
                    domEvents.addDelegateListener(this, eventName, handler, queue);
                } else {
                    domEvents.addEventListener(this, eventName, handler, queue);
                }
            } else {
                if ('addEventListener' in this) {
                    this.addEventListener(eventName, handler, queue);
                } else if (this[onKeyValueSymbol]) {
                    canReflect.onKeyValue(this, eventName, handler, queue);
                } else if (this[onEventSymbol]) {
                    this[onEventSymbol](eventName, handler, queue);
                } else {
                    if (!eventName && this[onValueSymbol]) {
                        canReflect.onValue(this, handler, queue);
                    } else {
                        throw new Error('can-event-queue: Unable to bind ' + eventName);
                    }
                }
            }
            return this;
        },
        off: function (eventName, handler, queue) {
            var listenWithDOM = isDomEventTarget(this);
            if (listenWithDOM) {
                if (typeof handler === 'string') {
                    domEvents.removeDelegateListener(this, eventName, handler, queue);
                } else {
                    domEvents.removeEventListener(this, eventName, handler, queue);
                }
            } else {
                if ('removeEventListener' in this) {
                    this.removeEventListener(eventName, handler, queue);
                } else if (this[offKeyValueSymbol]) {
                    canReflect.offKeyValue(this, eventName, handler, queue);
                } else if (this[offEventSymbol]) {
                    this[offEventSymbol](eventName, handler, queue);
                } else {
                    if (!eventName && this[offValueSymbol]) {
                        canReflect.offValue(this, handler, queue);
                    } else {
                        throw new Error('can-event-queue: Unable to unbind ' + eventName);
                    }
                }
            }
            return this;
        }
    };
    var symbols = {
        'can.onKeyValue': function (key, handler, queueName) {
            ensureMeta(this).handlers.add([
                key,
                'onKeyValue',
                queueName || 'mutate',
                handler
            ]);
        },
        'can.offKeyValue': function (key, handler, queueName) {
            ensureMeta(this).handlers.delete([
                key,
                'onKeyValue',
                queueName || 'mutate',
                handler
            ]);
        },
        'can.isBound': function () {
            return !ensureMeta(this).handlers.isEmpty();
        },
        'can.getWhatIChange': function getWhatIChange(key) {
        },
        'can.onPatches': function (handler, queue) {
            var handlers = ensureMeta(this).handlers;
            handlers.add([
                'can.patches',
                'onKeyValue',
                queue || 'notify',
                handler
            ]);
        },
        'can.offPatches': function (handler, queue) {
            var handlers = ensureMeta(this).handlers;
            handlers.delete([
                'can.patches',
                'onKeyValue',
                queue || 'notify',
                handler
            ]);
        }
    };
    function defineNonEnumerable(obj, prop, value) {
        Object.defineProperty(obj, prop, {
            enumerable: false,
            value: value
        });
    }
    legacyMapBindings = function (obj) {
        canReflect.assignMap(obj, props);
        return canReflect.assignSymbols(obj, symbols);
    };
    defineNonEnumerable(legacyMapBindings, 'addHandlers', addHandlers);
    defineNonEnumerable(legacyMapBindings, 'stopListeningArgumentsToKeys', stopListeningArgumentsToKeys);
    props.bind = props.addEventListener;
    props.unbind = props.removeEventListener;
    canReflect.assignMap(legacyMapBindings, props);
    canReflect.assignSymbols(legacyMapBindings, symbols);
    defineNonEnumerable(legacyMapBindings, 'start', function () {
        console.warn('use can-queues.batch.start()');
        queues.batch.start();
    });
    defineNonEnumerable(legacyMapBindings, 'stop', function () {
        console.warn('use can-queues.batch.stop()');
        queues.batch.stop();
    });
    defineNonEnumerable(legacyMapBindings, 'flush', function () {
        console.warn('use can-queues.flush()');
        queues.flush();
    });
    defineNonEnumerable(legacyMapBindings, 'afterPreviousEvents', function (handler) {
        console.warn('don\'t use afterPreviousEvents');
        queues.mutateQueue.enqueue(function afterPreviousEvents() {
            queues.mutateQueue.enqueue(handler);
        });
        queues.flush();
    });
    defineNonEnumerable(legacyMapBindings, 'after', function (handler) {
        console.warn('don\'t use after');
        queues.mutateQueue.enqueue(handler);
        queues.flush();
    });
    module.exports = legacyMapBindings;
});
/*can-simple-map@4.3.0#can-simple-map*/
define('can-simple-map@4.3.0#can-simple-map', [
    'require',
    'exports',
    'module',
    'can-construct',
    'can-event-queue/map/map',
    'can-queues',
    'can-observation-recorder',
    'can-reflect',
    'can-log/dev/dev',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var Construct = require('can-construct');
    var eventQueue = require('can-event-queue/map/map');
    var queues = require('can-queues');
    var ObservationRecorder = require('can-observation-recorder');
    var canReflect = require('can-reflect');
    var dev = require('can-log/dev/dev');
    var canSymbol = require('can-symbol');
    var ensureMeta = function ensureMeta(obj) {
        var metaSymbol = canSymbol.for('can.meta');
        var meta = obj[metaSymbol];
        if (!meta) {
            meta = {};
            canReflect.setKeyValue(obj, metaSymbol, meta);
        }
        return meta;
    };
    var SimpleMap = Construct.extend('SimpleMap', {
        setup: function (initialData) {
            this._data = {};
            if (initialData && typeof initialData === 'object') {
                this.attr(initialData);
            }
        },
        attr: function (prop, value) {
            var self = this;
            if (arguments.length === 0) {
                ObservationRecorder.add(this, 'can.keys');
                var data = {};
                canReflect.eachKey(this._data, function (value, prop) {
                    ObservationRecorder.add(this, prop);
                    data[prop] = value;
                }, this);
                return data;
            } else if (arguments.length > 1) {
                var had = this._data.hasOwnProperty(prop);
                var old = this._data[prop];
                this._data[prop] = value;
                if (old !== value) {
                    var dispatched = {
                        keyChanged: !had ? prop : undefined,
                        type: prop
                    };
                    this.dispatch(dispatched, [
                        value,
                        old
                    ]);
                }
            } else if (typeof prop === 'object') {
                queues.batch.start();
                canReflect.eachKey(prop, function (value, key) {
                    self.attr(key, value);
                });
                queues.batch.stop();
            } else {
                if (prop !== 'constructor') {
                    ObservationRecorder.add(this, prop);
                    return this._data[prop];
                }
                return this.constructor;
            }
        },
        serialize: function () {
            return canReflect.serialize(this, Map);
        },
        get: function () {
            return this.attr.apply(this, arguments);
        },
        set: function () {
            return this.attr.apply(this, arguments);
        },
        log: function (key) {
        }
    });
    eventQueue(SimpleMap.prototype);
    var simpleMapProto = {
        'can.isMapLike': true,
        'can.isListLike': false,
        'can.isValueLike': false,
        'can.getKeyValue': SimpleMap.prototype.get,
        'can.setKeyValue': SimpleMap.prototype.set,
        'can.deleteKeyValue': function (prop) {
            var dispatched;
            if (this._data.hasOwnProperty(prop)) {
                var old = this._data[prop];
                delete this._data[prop];
                dispatched = {
                    keyChanged: prop,
                    type: prop
                };
                this.dispatch(dispatched, [
                    undefined,
                    old
                ]);
            }
        },
        'can.getOwnEnumerableKeys': function () {
            ObservationRecorder.add(this, 'can.keys');
            return Object.keys(this._data);
        },
        'can.assignDeep': function (source) {
            queues.batch.start();
            canReflect.assignMap(this, source);
            queues.batch.stop();
        },
        'can.updateDeep': function (source) {
            queues.batch.start();
            canReflect.updateMap(this, source);
            queues.batch.stop();
        },
        'can.keyHasDependencies': function (key) {
            return false;
        },
        'can.getKeyDependencies': function (key) {
            return undefined;
        },
        'can.hasOwnKey': function (key) {
            return this._data.hasOwnProperty(key);
        }
    };
    canReflect.assignSymbols(SimpleMap.prototype, simpleMapProto);
    module.exports = SimpleMap;
});
/*can-view-scope@4.11.0#template-context*/
define('can-view-scope@4.11.0#template-context', [
    'require',
    'exports',
    'module',
    'can-simple-map'
], function (require, exports, module) {
    'use strict';
    var SimpleMap = require('can-simple-map');
    var TemplateContext = function (options) {
        options = options || {};
        this.vars = new SimpleMap(options.vars || {});
        this.helpers = new SimpleMap(options.helpers || {});
        this.partials = new SimpleMap(options.partials || {});
        this.tags = new SimpleMap(options.tags || {});
    };
    module.exports = TemplateContext;
});
/*can-define-lazy-value@1.1.0#define-lazy-value*/
define('can-define-lazy-value@1.1.0#define-lazy-value', function (require, exports, module) {
    'use strict';
    module.exports = function defineLazyValue(obj, prop, initializer, writable) {
        Object.defineProperty(obj, prop, {
            configurable: true,
            get: function () {
                Object.defineProperty(this, prop, {
                    value: undefined,
                    writable: true
                });
                var value = initializer.call(this, obj, prop);
                Object.defineProperty(this, prop, {
                    value: value,
                    writable: !!writable
                });
                return value;
            },
            set: function (value) {
                Object.defineProperty(this, prop, {
                    value: value,
                    writable: !!writable
                });
                return value;
            }
        });
    };
});
/*can-event-queue@1.1.3#value/value*/
define('can-event-queue@1.1.3#value/value', [
    'require',
    'exports',
    'module',
    'can-queues',
    'can-key-tree',
    'can-reflect',
    'can-define-lazy-value',
    '../dependency-record/merge'
], function (require, exports, module) {
    'use strict';
    var queues = require('can-queues');
    var KeyTree = require('can-key-tree');
    var canReflect = require('can-reflect');
    var defineLazyValue = require('can-define-lazy-value');
    var mergeDependencyRecords = require('../dependency-record/merge');
    var properties = {
        on: function (handler, queue) {
            this.handlers.add([
                queue || 'mutate',
                handler
            ]);
        },
        off: function (handler, queueName) {
            if (handler === undefined) {
                if (queueName === undefined) {
                    this.handlers.delete([]);
                } else {
                    this.handlers.delete([queueName]);
                }
            } else {
                this.handlers.delete([
                    queueName || 'mutate',
                    handler
                ]);
            }
        }
    };
    var symbols = {
        'can.onValue': properties.on,
        'can.offValue': properties.off,
        'can.dispatch': function (value, old) {
            var queuesArgs = [];
            queuesArgs = [
                this.handlers.getNode([]),
                this,
                [
                    value,
                    old
                ]
            ];
            queues.enqueueByQueue.apply(queues, queuesArgs);
        },
        'can.getWhatIChange': function getWhatIChange() {
        },
        'can.isBound': function isBound() {
            return !this.handlers.isEmpty();
        }
    };
    function defineLazyHandlers() {
        return new KeyTree([
            Object,
            Array
        ], {
            onFirst: this.onBound !== undefined && this.onBound.bind(this),
            onEmpty: this.onUnbound !== undefined && this.onUnbound.bind(this)
        });
    }
    var mixinValueEventBindings = function (obj) {
        canReflect.assign(obj, properties);
        canReflect.assignSymbols(obj, symbols);
        defineLazyValue(obj, 'handlers', defineLazyHandlers, true);
        return obj;
    };
    mixinValueEventBindings.addHandlers = function (obj, callbacks) {
        console.warn('can-event-queue/value: Avoid using addHandlers. Add onBound and onUnbound methods instead.');
        obj.handlers = new KeyTree([
            Object,
            Array
        ], callbacks);
        return obj;
    };
    module.exports = mixinValueEventBindings;
});
/*can-observation@4.1.1#recorder-dependency-helpers*/
define('can-observation@4.1.1#recorder-dependency-helpers', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    function addNewKeyDependenciesIfNotInOld(event) {
        if (this.oldEventSet === undefined || this.oldEventSet['delete'](event) === false) {
            canReflect.onKeyValue(this.observable, event, this.onDependencyChange, 'notify');
        }
    }
    function addObservablesNewKeyDependenciesIfNotInOld(eventSet, observable) {
        eventSet.forEach(addNewKeyDependenciesIfNotInOld, {
            onDependencyChange: this.onDependencyChange,
            observable: observable,
            oldEventSet: this.oldDependencies.keyDependencies.get(observable)
        });
    }
    function removeKeyDependencies(event) {
        canReflect.offKeyValue(this.observable, event, this.onDependencyChange, 'notify');
    }
    function removeObservablesKeyDependencies(oldEventSet, observable) {
        oldEventSet.forEach(removeKeyDependencies, {
            onDependencyChange: this.onDependencyChange,
            observable: observable
        });
    }
    function addValueDependencies(observable) {
        if (this.oldDependencies.valueDependencies.delete(observable) === false) {
            canReflect.onValue(observable, this.onDependencyChange, 'notify');
        }
    }
    function removeValueDependencies(observable) {
        canReflect.offValue(observable, this.onDependencyChange, 'notify');
    }
    module.exports = {
        updateObservations: function (observationData) {
            observationData.newDependencies.keyDependencies.forEach(addObservablesNewKeyDependenciesIfNotInOld, observationData);
            observationData.oldDependencies.keyDependencies.forEach(removeObservablesKeyDependencies, observationData);
            observationData.newDependencies.valueDependencies.forEach(addValueDependencies, observationData);
            observationData.oldDependencies.valueDependencies.forEach(removeValueDependencies, observationData);
        },
        stopObserving: function (observationReciever, onDependencyChange) {
            observationReciever.keyDependencies.forEach(removeObservablesKeyDependencies, { onDependencyChange: onDependencyChange });
            observationReciever.valueDependencies.forEach(removeValueDependencies, { onDependencyChange: onDependencyChange });
        }
    };
});
/*can-observation@4.1.1#temporarily-bind*/
define('can-observation@4.1.1#temporarily-bind', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var temporarilyBoundNoOperation = function () {
    };
    var observables;
    var unbindTemporarilyBoundValue = function () {
        for (var i = 0, len = observables.length; i < len; i++) {
            canReflect.offValue(observables[i], temporarilyBoundNoOperation);
        }
        observables = null;
    };
    function temporarilyBind(compute) {
        var computeInstance = compute.computeInstance || compute;
        canReflect.onValue(computeInstance, temporarilyBoundNoOperation);
        if (!observables) {
            observables = [];
            setTimeout(unbindTemporarilyBoundValue, 10);
        }
        observables.push(computeInstance);
    }
    module.exports = temporarilyBind;
});
/*can-observation@4.1.1#can-observation*/
define('can-observation@4.1.1#can-observation', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-reflect',
    'can-queues',
    'can-observation-recorder',
    'can-symbol',
    'can-log/dev/dev',
    'can-event-queue/value/value',
    './recorder-dependency-helpers',
    './temporarily-bind'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var namespace = require('can-namespace');
        var canReflect = require('can-reflect');
        var queues = require('can-queues');
        var ObservationRecorder = require('can-observation-recorder');
        var canSymbol = require('can-symbol');
        var dev = require('can-log/dev/dev');
        var valueEventBindings = require('can-event-queue/value/value');
        var recorderHelpers = require('./recorder-dependency-helpers');
        var temporarilyBind = require('./temporarily-bind');
        var dispatchSymbol = canSymbol.for('can.dispatch');
        var getChangesSymbol = canSymbol.for('can.getChangesDependencyRecord');
        var getValueDependenciesSymbol = canSymbol.for('can.getValueDependencies');
        function Observation(func, context, options) {
            this.func = func;
            this.context = context;
            this.options = options || {
                priority: 0,
                isObservable: true
            };
            this.bound = false;
            this._value = undefined;
            this.newDependencies = ObservationRecorder.makeDependenciesRecord();
            this.oldDependencies = null;
            var self = this;
            this.onDependencyChange = function (newVal) {
                self.dependencyChange(this, newVal);
            };
            this.update = this.update.bind(this);
        }
        valueEventBindings(Observation.prototype);
        canReflect.assign(Observation.prototype, {
            onBound: function () {
                this.bound = true;
                this.oldDependencies = this.newDependencies;
                ObservationRecorder.start();
                this._value = this.func.call(this.context);
                this.newDependencies = ObservationRecorder.stop();
                recorderHelpers.updateObservations(this);
            },
            dependencyChange: function (context, args) {
                if (this.bound === true) {
                    var queuesArgs = [];
                    queuesArgs = [
                        this.update,
                        this,
                        [],
                        { priority: this.options.priority }
                    ];
                    queues.deriveQueue.enqueue.apply(queues.deriveQueue, queuesArgs);
                }
            },
            update: function () {
                if (this.bound === true) {
                    var oldValue = this._value;
                    this.oldValue = null;
                    this.onBound();
                    if (oldValue !== this._value) {
                        this[dispatchSymbol](this._value, oldValue);
                    }
                }
            },
            onUnbound: function () {
                this.bound = false;
                recorderHelpers.stopObserving(this.newDependencies, this.onDependencyChange);
                this.newDependencies = ObservationRecorder.makeDependenciesRecorder();
            },
            get: function () {
                if (this.options.isObservable && ObservationRecorder.isRecording()) {
                    ObservationRecorder.add(this);
                    if (!this.bound) {
                        Observation.temporarilyBind(this);
                    }
                }
                if (this.bound === true) {
                    if (queues.deriveQueue.tasksRemainingCount() > 0) {
                        Observation.updateChildrenAndSelf(this);
                    }
                    return this._value;
                } else {
                    return this.func.call(this.context);
                }
            },
            hasDependencies: function () {
                var newDependencies = this.newDependencies;
                return this.bound ? newDependencies.valueDependencies.size + newDependencies.keyDependencies.size > 0 : undefined;
            },
            log: function () {
            }
        });
        Object.defineProperty(Observation.prototype, 'value', {
            get: function () {
                return this.get();
            }
        });
        var observationProto = {
            'can.getValue': Observation.prototype.get,
            'can.isValueLike': true,
            'can.isMapLike': false,
            'can.isListLike': false,
            'can.valueHasDependencies': Observation.prototype.hasDependencies,
            'can.getValueDependencies': function () {
                if (this.bound === true) {
                    var deps = this.newDependencies, result = {};
                    if (deps.keyDependencies.size) {
                        result.keyDependencies = deps.keyDependencies;
                    }
                    if (deps.valueDependencies.size) {
                        result.valueDependencies = deps.valueDependencies;
                    }
                    return result;
                }
                return undefined;
            },
            'can.getPriority': function () {
                return this.options.priority;
            },
            'can.setPriority': function (priority) {
                this.options.priority = priority;
            }
        };
        canReflect.assignSymbols(Observation.prototype, observationProto);
        Observation.updateChildrenAndSelf = function (observation) {
            if (observation.update !== undefined && queues.deriveQueue.isEnqueued(observation.update) === true) {
                queues.deriveQueue.flushQueuedTask(observation.update);
                return true;
            }
            if (observation[getValueDependenciesSymbol]) {
                var childHasChanged = false;
                var valueDependencies = observation[getValueDependenciesSymbol]().valueDependencies || [];
                valueDependencies.forEach(function (observable) {
                    if (Observation.updateChildrenAndSelf(observable) === true) {
                        childHasChanged = true;
                    }
                });
                return childHasChanged;
            } else {
                return false;
            }
        };
        var alias = { addAll: 'addMany' };
        [
            'add',
            'addAll',
            'ignore',
            'trap',
            'trapsCount',
            'isRecording'
        ].forEach(function (methodName) {
            Observation[methodName] = function () {
                var name = alias[methodName] ? alias[methodName] : methodName;
                console.warn('can-observation: Call ' + name + '() on can-observation-recorder.');
                return ObservationRecorder[name].apply(this, arguments);
            };
        });
        Observation.prototype.start = function () {
            console.warn('can-observation: Use .on and .off to bind.');
            return this.onBound();
        };
        Observation.prototype.stop = function () {
            console.warn('can-observation: Use .on and .off to bind.');
            return this.onUnbound();
        };
        Observation.temporarilyBind = temporarilyBind;
        module.exports = namespace.Observation = Observation;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-cid@1.3.0#can-cid*/
define('can-cid@1.3.0#can-cid', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var _cid = 0;
    var domExpando = 'can' + new Date();
    var cid = function (object, name) {
        var propertyName = object.nodeName ? domExpando : '_cid';
        if (!object[propertyName]) {
            _cid++;
            object[propertyName] = (name || '') + _cid;
        }
        return object[propertyName];
    };
    cid.domExpando = domExpando;
    cid.get = function (object) {
        var type = typeof object;
        var isObject = type !== null && (type === 'object' || type === 'function');
        return isObject ? cid(object) : type + ':' + object;
    };
    if (namespace.cid) {
        throw new Error('You can\'t have two versions of can-cid, check your dependencies');
    } else {
        module.exports = namespace.cid = cid;
    }
});
/*can-single-reference@1.2.0#can-single-reference*/
define('can-single-reference@1.2.0#can-single-reference', [
    'require',
    'exports',
    'module',
    'can-cid'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var CID = require('can-cid');
        var singleReference;
        function getKeyName(key, extraKey) {
            var keyName = extraKey ? CID(key) + ':' + extraKey : CID(key);
            return keyName || key;
        }
        singleReference = {
            set: function (obj, key, value, extraKey) {
                obj[getKeyName(key, extraKey)] = value;
            },
            getAndDelete: function (obj, key, extraKey) {
                var keyName = getKeyName(key, extraKey);
                var value = obj[keyName];
                delete obj[keyName];
                return value;
            }
        };
        module.exports = singleReference;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-scope@4.11.0#make-compute-like*/
define('can-view-scope@4.11.0#make-compute-like', [
    'require',
    'exports',
    'module',
    'can-single-reference',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var singleReference = require('can-single-reference');
    var canReflect = require('can-reflect');
    var Compute = function (newVal) {
        if (arguments.length) {
            return canReflect.setValue(this, newVal);
        } else {
            return canReflect.getValue(this);
        }
    };
    module.exports = function (observable) {
        var compute = Compute.bind(observable);
        compute.on = compute.bind = compute.addEventListener = function (event, handler) {
            var translationHandler = function (newVal, oldVal) {
                handler.call(compute, { type: 'change' }, newVal, oldVal);
            };
            singleReference.set(handler, this, translationHandler);
            observable.on(translationHandler);
        };
        compute.off = compute.unbind = compute.removeEventListener = function (event, handler) {
            observable.off(singleReference.getAndDelete(handler, this));
        };
        canReflect.assignSymbols(compute, {
            'can.getValue': function () {
                return canReflect.getValue(observable);
            },
            'can.setValue': function (newVal) {
                return canReflect.setValue(observable, newVal);
            },
            'can.onValue': function (handler, queue) {
                return canReflect.onValue(observable, handler, queue);
            },
            'can.offValue': function (handler, queue) {
                return canReflect.offValue(observable, handler, queue);
            },
            'can.valueHasDependencies': function () {
                return canReflect.valueHasDependencies(observable);
            },
            'can.getPriority': function () {
                return canReflect.getPriority(observable);
            },
            'can.setPriority': function (newPriority) {
                canReflect.setPriority(observable, newPriority);
            },
            'can.isValueLike': true,
            'can.isFunctionLike': false
        });
        compute.isComputed = true;
        return compute;
    };
});
/*can-reflect-dependencies@1.1.1#src/add-mutated-by*/
define('can-reflect-dependencies@1.1.1#src/add-mutated-by', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var makeDependencyRecord = function makeDependencyRecord() {
        return {
            keyDependencies: new Map(),
            valueDependencies: new Set()
        };
    };
    var makeRootRecord = function makeRootRecord() {
        return {
            mutateDependenciesForKey: new Map(),
            mutateDependenciesForValue: makeDependencyRecord()
        };
    };
    module.exports = function (mutatedByMap) {
        return function addMutatedBy(mutated, key, mutator) {
            var gotKey = arguments.length === 3;
            if (arguments.length === 2) {
                mutator = key;
                key = undefined;
            }
            if (!mutator.keyDependencies && !mutator.valueDependencies) {
                var s = new Set();
                s.add(mutator);
                mutator = { valueDependencies: s };
            }
            var root = mutatedByMap.get(mutated);
            if (!root) {
                root = makeRootRecord();
                mutatedByMap.set(mutated, root);
            }
            if (gotKey && !root.mutateDependenciesForKey.get(key)) {
                root.mutateDependenciesForKey.set(key, makeDependencyRecord());
            }
            var dependencyRecord = gotKey ? root.mutateDependenciesForKey.get(key) : root.mutateDependenciesForValue;
            if (mutator.valueDependencies) {
                canReflect.addValues(dependencyRecord.valueDependencies, mutator.valueDependencies);
            }
            if (mutator.keyDependencies) {
                canReflect.each(mutator.keyDependencies, function (keysSet, obj) {
                    var entry = dependencyRecord.keyDependencies.get(obj);
                    if (!entry) {
                        entry = new Set();
                        dependencyRecord.keyDependencies.set(obj, entry);
                    }
                    canReflect.addValues(entry, keysSet);
                });
            }
        };
    };
});
/*can-reflect-dependencies@1.1.1#src/delete-mutated-by*/
define('can-reflect-dependencies@1.1.1#src/delete-mutated-by', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    module.exports = function (mutatedByMap) {
        return function deleteMutatedBy(mutated, key, mutator) {
            var gotKey = arguments.length === 3;
            var root = mutatedByMap.get(mutated);
            if (arguments.length === 2) {
                mutator = key;
                key = undefined;
            }
            if (!mutator.keyDependencies && !mutator.valueDependencies) {
                var s = new Set();
                s.add(mutator);
                mutator = { valueDependencies: s };
            }
            var dependencyRecord = gotKey ? root.mutateDependenciesForKey.get(key) : root.mutateDependenciesForValue;
            if (mutator.valueDependencies) {
                canReflect.removeValues(dependencyRecord.valueDependencies, mutator.valueDependencies);
            }
            if (mutator.keyDependencies) {
                canReflect.each(mutator.keyDependencies, function (keysSet, obj) {
                    var entry = dependencyRecord.keyDependencies.get(obj);
                    if (entry) {
                        canReflect.removeValues(entry, keysSet);
                        if (!entry.size) {
                            dependencyRecord.keyDependencies.delete(obj);
                        }
                    }
                });
            }
        };
    };
});
/*can-reflect-dependencies@1.1.1#src/is-function*/
define('can-reflect-dependencies@1.1.1#src/is-function', function (require, exports, module) {
    'use strict';
    module.exports = function isFunction(value) {
        return typeof value === 'function';
    };
});
/*can-reflect-dependencies@1.1.1#src/get-dependency-data-of*/
define('can-reflect-dependencies@1.1.1#src/get-dependency-data-of', [
    'require',
    'exports',
    'module',
    'can-symbol',
    'can-reflect',
    './is-function',
    'can-assign'
], function (require, exports, module) {
    'use strict';
    var canSymbol = require('can-symbol');
    var canReflect = require('can-reflect');
    var isFunction = require('./is-function');
    var canAssign = require('can-assign');
    var getWhatIChangeSymbol = canSymbol.for('can.getWhatIChange');
    var getKeyDependenciesSymbol = canSymbol.for('can.getKeyDependencies');
    var getValueDependenciesSymbol = canSymbol.for('can.getValueDependencies');
    var getKeyDependencies = function getKeyDependencies(obj, key) {
        if (isFunction(obj[getKeyDependenciesSymbol])) {
            return canReflect.getKeyDependencies(obj, key);
        }
    };
    var getValueDependencies = function getValueDependencies(obj) {
        if (isFunction(obj[getValueDependenciesSymbol])) {
            return canReflect.getValueDependencies(obj);
        }
    };
    var getMutatedKeyDependencies = function getMutatedKeyDependencies(mutatedByMap, obj, key) {
        var root = mutatedByMap.get(obj);
        var dependencyRecord;
        if (root && root.mutateDependenciesForKey.has(key)) {
            dependencyRecord = root.mutateDependenciesForKey.get(key);
        }
        return dependencyRecord;
    };
    var getMutatedValueDependencies = function getMutatedValueDependencies(mutatedByMap, obj) {
        var result;
        var root = mutatedByMap.get(obj);
        if (root) {
            var dependencyRecord = root.mutateDependenciesForValue;
            if (dependencyRecord.keyDependencies.size) {
                result = result || {};
                result.keyDependencies = dependencyRecord.keyDependencies;
            }
            if (dependencyRecord.valueDependencies.size) {
                result = result || {};
                result.valueDependencies = dependencyRecord.valueDependencies;
            }
        }
        return result;
    };
    var getWhatIChange = function getWhatIChange(obj, key) {
        if (isFunction(obj[getWhatIChangeSymbol])) {
            var gotKey = arguments.length === 2;
            return gotKey ? canReflect.getWhatIChange(obj, key) : canReflect.getWhatIChange(obj);
        }
    };
    var isEmptyRecord = function isEmptyRecord(record) {
        return record == null || !Object.keys(record).length || record.keyDependencies && !record.keyDependencies.size && (record.valueDependencies && !record.valueDependencies.size);
    };
    var getWhatChangesMe = function getWhatChangesMe(mutatedByMap, obj, key) {
        var gotKey = arguments.length === 3;
        var mutate = gotKey ? getMutatedKeyDependencies(mutatedByMap, obj, key) : getMutatedValueDependencies(mutatedByMap, obj);
        var derive = gotKey ? getKeyDependencies(obj, key) : getValueDependencies(obj);
        if (!isEmptyRecord(mutate) || !isEmptyRecord(derive)) {
            return canAssign(canAssign({}, mutate ? { mutate: mutate } : null), derive ? { derive: derive } : null);
        }
    };
    module.exports = function (mutatedByMap) {
        return function getDependencyDataOf(obj, key) {
            var gotKey = arguments.length === 2;
            var whatChangesMe = gotKey ? getWhatChangesMe(mutatedByMap, obj, key) : getWhatChangesMe(mutatedByMap, obj);
            var whatIChange = gotKey ? getWhatIChange(obj, key) : getWhatIChange(obj);
            if (whatChangesMe || whatIChange) {
                return canAssign(canAssign({}, whatIChange ? { whatIChange: whatIChange } : null), whatChangesMe ? { whatChangesMe: whatChangesMe } : null);
            }
        };
    };
});
/*can-reflect-dependencies@1.1.1#can-reflect-dependencies*/
define('can-reflect-dependencies@1.1.1#can-reflect-dependencies', [
    'require',
    'exports',
    'module',
    './src/add-mutated-by',
    './src/delete-mutated-by',
    './src/get-dependency-data-of'
], function (require, exports, module) {
    'use strict';
    var addMutatedBy = require('./src/add-mutated-by');
    var deleteMutatedBy = require('./src/delete-mutated-by');
    var getDependencyDataOf = require('./src/get-dependency-data-of');
    var mutatedByMap = new WeakMap();
    module.exports = {
        addMutatedBy: addMutatedBy(mutatedByMap),
        deleteMutatedBy: deleteMutatedBy(mutatedByMap),
        getDependencyDataOf: getDependencyDataOf(mutatedByMap)
    };
});
/*can-stache-helpers@1.2.0#can-stache-helpers*/
define('can-stache-helpers@1.2.0#can-stache-helpers', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    if (namespace.stacheHelpers) {
        throw new Error('You can\'t have two versions of can-stache-helpers, check your dependencies');
    } else {
        module.exports = namespace.stacheHelpers = {};
    }
});
/*can-simple-observable@2.4.0#log*/
define('can-simple-observable@2.4.0#log', [
    'require',
    'exports',
    'module',
    'can-log/dev/dev',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var dev = require('can-log/dev/dev');
    var canReflect = require('can-reflect');
    function quoteString(x) {
        return typeof x === 'string' ? JSON.stringify(x) : x;
    }
    module.exports = function log() {
    };
});
/*can-simple-observable@2.4.0#can-simple-observable*/
define('can-simple-observable@2.4.0#can-simple-observable', [
    'require',
    'exports',
    'module',
    './log',
    'can-namespace',
    'can-symbol',
    'can-reflect',
    'can-observation-recorder',
    'can-event-queue/value/value'
], function (require, exports, module) {
    'use strict';
    var log = require('./log');
    var ns = require('can-namespace');
    var canSymbol = require('can-symbol');
    var canReflect = require('can-reflect');
    var ObservationRecorder = require('can-observation-recorder');
    var valueEventBindings = require('can-event-queue/value/value');
    var dispatchSymbol = canSymbol.for('can.dispatch');
    function SimpleObservable(initialValue) {
        this._value = initialValue;
    }
    valueEventBindings(SimpleObservable.prototype);
    canReflect.assignMap(SimpleObservable.prototype, {
        log: log,
        get: function () {
            ObservationRecorder.add(this);
            return this._value;
        },
        set: function (value) {
            var old = this._value;
            this._value = value;
            this[dispatchSymbol](value, old);
        }
    });
    Object.defineProperty(SimpleObservable.prototype, 'value', {
        set: function (value) {
            return this.set(value);
        },
        get: function () {
            return this.get();
        }
    });
    var simpleObservableProto = {
        'can.getValue': SimpleObservable.prototype.get,
        'can.setValue': SimpleObservable.prototype.set,
        'can.isMapLike': false,
        'can.valueHasDependencies': function () {
            return true;
        }
    };
    canReflect.assignSymbols(SimpleObservable.prototype, simpleObservableProto);
    module.exports = ns.SimpleObservable = SimpleObservable;
});
/*can-view-scope@4.11.0#scope-key-data*/
define('can-view-scope@4.11.0#scope-key-data', [
    'require',
    'exports',
    'module',
    'can-observation',
    'can-stache-key',
    'can-assign',
    'can-reflect',
    'can-symbol',
    'can-observation-recorder',
    './make-compute-like',
    'can-reflect-dependencies',
    'can-event-queue/value/value',
    'can-stache-helpers',
    'can-simple-observable'
], function (require, exports, module) {
    'use strict';
    var Observation = require('can-observation');
    var observeReader = require('can-stache-key');
    var assign = require('can-assign');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var ObservationRecorder = require('can-observation-recorder');
    var makeComputeLike = require('./make-compute-like');
    var canReflectDeps = require('can-reflect-dependencies');
    var valueEventBindings = require('can-event-queue/value/value');
    var stacheHelpers = require('can-stache-helpers');
    var SimpleObservable = require('can-simple-observable');
    var dispatchSymbol = canSymbol.for('can.dispatch');
    var peekValue = ObservationRecorder.ignore(canReflect.getValue.bind(canReflect));
    var getFastPathRoot = ObservationRecorder.ignore(function (computeData) {
        if (computeData.reads && computeData.reads.length === 1) {
            var root = computeData.root;
            if (root && root[canSymbol.for('can.getValue')]) {
                root = canReflect.getValue(root);
            }
            return root && canReflect.isObservableLike(root) && canReflect.isMapLike(root) && typeof root[computeData.reads[0].key] !== 'function' && root;
        }
        return;
    });
    var isEventObject = function (obj) {
        return obj && typeof obj.batchNum === 'number' && typeof obj.type === 'string';
    };
    function callMutateWithRightArgs(method, mutated, reads, mutator) {
        if (reads.length) {
            method.call(canReflectDeps, mutated, reads[reads.length - 1].key, mutator);
        } else {
            method.call(canReflectDeps, mutated, mutator);
        }
    }
    var ScopeKeyData = function (scope, key, options) {
        this.startingScope = scope;
        this.key = key;
        this.read = this.read.bind(this);
        this.dispatch = this.dispatch.bind(this);
        if (key === 'debugger') {
            this.startingScope = { _context: stacheHelpers };
            this.read = function () {
                var helperOptions = { scope: scope };
                var debuggerHelper = stacheHelpers['debugger'];
                return debuggerHelper(helperOptions);
            };
        }
        var observation = this.observation = new Observation(this.read, this);
        this.options = assign({ observation: this.observation }, options);
        this.fastPath = undefined;
        this.root = undefined;
        this.initialValue = undefined;
        this.reads = undefined;
        this.setRoot = undefined;
        this._thisArg = new SimpleObservable();
        this.parentHasKey = undefined;
        var valueDependencies = new Set();
        valueDependencies.add(observation);
        this.dependencies = { valueDependencies: valueDependencies };
    };
    valueEventBindings(ScopeKeyData.prototype);
    function fastOnBoundSet_Value() {
        this._value = this.newVal;
    }
    function fastOnBoundSetValue() {
        this.value = this.newVal;
    }
    assign(ScopeKeyData.prototype, {
        constructor: ScopeKeyData,
        dispatch: function dispatch(newVal) {
            var old = this.value;
            this.value = newVal;
            this[dispatchSymbol].call(this, this.value, old);
        },
        onBound: function onBound() {
            this.bound = true;
            canReflect.onValue(this.observation, this.dispatch, 'notify');
            var fastPathRoot = getFastPathRoot(this);
            if (fastPathRoot) {
                this.toFastPath(fastPathRoot);
            }
            this.value = peekValue(this.observation);
        },
        onUnbound: function onUnbound() {
            this.bound = false;
            canReflect.offValue(this.observation, this.dispatch, 'notify');
            this.toSlowPath();
        },
        set: function (newVal) {
            var root = this.root || this.setRoot;
            if (root) {
                if (this.reads.length) {
                    observeReader.write(root, this.reads, newVal, this.options);
                } else {
                    canReflect.setValue(root, newVal);
                }
            } else {
                this.startingScope.set(this.key, newVal, this.options);
            }
        },
        get: function () {
            if (ObservationRecorder.isRecording()) {
                ObservationRecorder.add(this);
                if (!this.bound) {
                    Observation.temporarilyBind(this);
                }
            }
            if (this.bound === true) {
                return this.value;
            } else {
                return this.observation.get();
            }
        },
        toFastPath: function (fastPathRoot) {
            var self = this, observation = this.observation;
            this.fastPath = true;
            observation.dependencyChange = function (target, newVal) {
                if (isEventObject(newVal)) {
                    throw 'no event objects!';
                }
                if (target === fastPathRoot && typeof newVal !== 'function') {
                    this.newVal = newVal;
                } else {
                    self.toSlowPath();
                }
                return Observation.prototype.dependencyChange.apply(this, arguments);
            };
            if (observation.hasOwnProperty('_value')) {
                observation.onBound = fastOnBoundSet_Value;
            } else {
                observation.onBound = fastOnBoundSetValue;
            }
        },
        toSlowPath: function () {
            this.observation.dependencyChange = Observation.prototype.dependencyChange;
            this.observation.onBound = Observation.prototype.onBound;
            this.fastPath = false;
        },
        read: function () {
            var data;
            if (this.root) {
                data = observeReader.read(this.root, this.reads, this.options);
                this.thisArg = data.parent;
                return data.value;
            }
            data = this.startingScope.read(this.key, this.options);
            this.scope = data.scope;
            this.reads = data.reads;
            this.root = data.rootObserve;
            this.setRoot = data.setRoot;
            this.thisArg = data.thisArg;
            this.parentHasKey = data.parentHasKey;
            return this.initialValue = data.value;
        },
        hasDependencies: function () {
            return canReflect.valueHasDependencies(this.observation);
        }
    });
    Object.defineProperty(ScopeKeyData.prototype, 'thisArg', {
        get: function () {
            return this._thisArg.get();
        },
        set: function (newVal) {
            this._thisArg.set(newVal);
        }
    });
    var scopeKeyDataPrototype = {
        'can.getValue': ScopeKeyData.prototype.get,
        'can.setValue': ScopeKeyData.prototype.set,
        'can.valueHasDependencies': ScopeKeyData.prototype.hasDependencies,
        'can.getValueDependencies': function () {
            return this.dependencies;
        },
        'can.getPriority': function () {
            return canReflect.getPriority(this.observation);
        },
        'can.setPriority': function (newPriority) {
            canReflect.setPriority(this.observation, newPriority);
        }
    };
    canReflect.assignSymbols(ScopeKeyData.prototype, scopeKeyDataPrototype);
    Object.defineProperty(ScopeKeyData.prototype, 'compute', {
        get: function () {
            var compute = makeComputeLike(this);
            Object.defineProperty(this, 'compute', {
                value: compute,
                writable: false,
                configurable: false
            });
            return compute;
        },
        configurable: true
    });
    module.exports = ScopeKeyData;
});
/*can-view-scope@4.11.0#compute_data*/
define('can-view-scope@4.11.0#compute_data', [
    'require',
    'exports',
    'module',
    './scope-key-data'
], function (require, exports, module) {
    'use strict';
    var ScopeKeyData = require('./scope-key-data');
    module.exports = function (scope, key, options) {
        return new ScopeKeyData(scope, key, options || { args: [] });
    };
});
/*can-view-scope@4.11.0#can-view-scope*/
define('can-view-scope@4.11.0#can-view-scope', [
    'require',
    'exports',
    'module',
    'can-stache-key',
    'can-observation-recorder',
    './template-context',
    './compute_data',
    'can-assign',
    'can-namespace',
    'can-reflect',
    'can-log/dev/dev',
    'can-define-lazy-value',
    'can-stache-helpers',
    'can-simple-map'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var stacheKey = require('can-stache-key');
        var ObservationRecorder = require('can-observation-recorder');
        var TemplateContext = require('./template-context');
        var makeComputeData = require('./compute_data');
        var assign = require('can-assign');
        var namespace = require('can-namespace');
        var canReflect = require('can-reflect');
        var canLog = require('can-log/dev/dev');
        var defineLazyValue = require('can-define-lazy-value');
        var stacheHelpers = require('can-stache-helpers');
        var SimpleMap = require('can-simple-map');
        function canHaveProperties(obj) {
            return obj != null;
        }
        function returnFalse() {
            return false;
        }
        var LetContext = SimpleMap.extend('LetContext', {});
        function Scope(context, parent, meta) {
            this._context = context;
            this._parent = parent;
            this._meta = meta || {};
            this.__cache = {};
        }
        var parentContextSearch = /(\.\.\/)|(\.\/)|(this[\.@])/g;
        assign(Scope, {
            read: stacheKey.read,
            TemplateContext: TemplateContext,
            keyInfo: function (attr) {
                if (attr === './') {
                    attr = 'this';
                }
                var info = { remainingKey: attr };
                info.isScope = attr === 'scope';
                if (info.isScope) {
                    return info;
                }
                var firstSix = attr.substr(0, 6);
                info.isInScope = firstSix === 'scope.' || firstSix === 'scope@';
                if (info.isInScope) {
                    info.remainingKey = attr.substr(6);
                    return info;
                } else if (firstSix === 'scope/') {
                    info.walkScope = true;
                    info.remainingKey = attr.substr(6);
                    return info;
                } else if (attr.substr(0, 7) === '@scope/') {
                    info.walkScope = true;
                    info.remainingKey = attr.substr(7);
                    return info;
                }
                info.parentContextWalkCount = 0;
                info.remainingKey = attr.replace(parentContextSearch, function (token, parentContext, dotSlash, thisContext, index) {
                    info.isContextBased = true;
                    if (parentContext !== undefined) {
                        info.parentContextWalkCount++;
                    }
                    return '';
                });
                if (info.remainingKey === '..') {
                    info.parentContextWalkCount++;
                    info.remainingKey = 'this';
                } else if (info.remainingKey === '.' || info.remainingKey === '') {
                    info.remainingKey = 'this';
                }
                if (info.remainingKey === 'this') {
                    info.isContextBased = true;
                }
                return info;
            },
            isTemplateContextOrCanNotHaveProperties: function (currentScope) {
                var currentContext = currentScope._context;
                if (currentContext instanceof TemplateContext) {
                    return true;
                } else if (!canHaveProperties(currentContext)) {
                    return true;
                }
                return false;
            },
            shouldSkipIfSpecial: function (currentScope) {
                var isSpecialContext = currentScope._meta.special === true;
                if (isSpecialContext === true) {
                    return true;
                }
                if (Scope.isTemplateContextOrCanNotHaveProperties(currentScope)) {
                    return true;
                }
                return false;
            },
            shouldSkipEverythingButSpecial: function (currentScope) {
                var isSpecialContext = currentScope._meta.special === true;
                if (isSpecialContext === false) {
                    return true;
                }
                if (Scope.isTemplateContextOrCanNotHaveProperties(currentScope)) {
                    return true;
                }
                return false;
            },
            makeShouldExitOnSecondNormalContext: function () {
                var foundNormalContext = false;
                return function shouldExitOnSecondNormalContext(currentScope) {
                    var isNormalContext = !currentScope.isSpecial();
                    var shouldExit = isNormalContext && foundNormalContext;
                    if (isNormalContext) {
                        foundNormalContext = true;
                    }
                    return shouldExit;
                };
            },
            makeShouldExitAfterFirstNormalContext: function () {
                var foundNormalContext = false;
                return function shouldExitAfterFirstNormalContext(currentScope) {
                    if (foundNormalContext) {
                        return true;
                    }
                    var isNormalContext = !currentScope.isSpecial();
                    if (isNormalContext) {
                        foundNormalContext = true;
                    }
                    return false;
                };
            },
            makeShouldSkipSpecialContexts: function (parentContextWalkCount) {
                var walkCount = parentContextWalkCount || 0;
                return function shouldSkipSpecialContexts(currentScope) {
                    if (walkCount < 0 && currentScope._meta.notContext) {
                        return false;
                    }
                    if (currentScope.isSpecial()) {
                        return true;
                    }
                    walkCount--;
                    if (walkCount < 0) {
                        return false;
                    }
                    return true;
                };
            }
        });
        assign(Scope.prototype, {
            add: function (context, meta) {
                if (context !== this._context) {
                    return new this.constructor(context, this, meta);
                } else {
                    return this;
                }
            },
            find: function (attr, options) {
                var keyReads = stacheKey.reads(attr);
                var howToRead = {
                    shouldExit: returnFalse,
                    shouldSkip: Scope.shouldSkipIfSpecial,
                    shouldLookForHelper: true,
                    read: stacheKey.read
                };
                var result = this._walk(keyReads, options, howToRead);
                return result.value;
            },
            readFromSpecialContext: function (key) {
                return this._walk([{
                        key: key,
                        at: false
                    }], { special: true }, {
                    shouldExit: returnFalse,
                    shouldSkip: Scope.shouldSkipEverythingButSpecial,
                    shouldLookForHelper: false,
                    read: stacheKey.read
                });
            },
            readFromTemplateContext: function (key, readOptions) {
                var keyReads = stacheKey.reads(key);
                return stacheKey.read(this.templateContext, keyReads, readOptions);
            },
            read: function (attr, options) {
                options = options || {};
                return this.readKeyInfo(Scope.keyInfo(attr), options || {});
            },
            readKeyInfo: function (keyInfo, options) {
                var readValue, keyReads, howToRead = { read: options.read || stacheKey.read };
                if (keyInfo.isScope) {
                    return { value: this };
                } else if (keyInfo.isInScope) {
                    keyReads = stacheKey.reads(keyInfo.remainingKey);
                    readValue = stacheKey.read(this, keyReads, options);
                    if (typeof readValue.value === 'undefined' && !readValue.parentHasKey) {
                        readValue = this.readFromTemplateContext(keyInfo.remainingKey, options);
                    }
                    return assign(readValue, { thisArg: keyReads.length > 0 ? readValue.parent : undefined });
                } else if (keyInfo.isContextBased) {
                    if (keyInfo.remainingKey !== 'this') {
                        keyReads = stacheKey.reads(keyInfo.remainingKey);
                    } else {
                        keyReads = [];
                    }
                    howToRead.shouldExit = Scope.makeShouldExitOnSecondNormalContext();
                    howToRead.shouldSkip = Scope.makeShouldSkipSpecialContexts(keyInfo.parentContextWalkCount);
                    howToRead.shouldLookForHelper = true;
                    return this._walk(keyReads, options, howToRead);
                } else if (keyInfo.walkScope) {
                    howToRead.shouldExit = returnFalse;
                    howToRead.shouldSkip = Scope.shouldSkipIfSpecial;
                    howToRead.shouldLookForHelper = true;
                    keyReads = stacheKey.reads(keyInfo.remainingKey);
                    return this._walk(keyReads, options, howToRead);
                } else {
                    keyReads = stacheKey.reads(keyInfo.remainingKey);
                    var isSpecialRead = options && options.special === true;
                    howToRead.shouldExit = Scope.makeShouldExitOnSecondNormalContext();
                    howToRead.shouldSkip = isSpecialRead ? Scope.shouldSkipEverythingButSpecial : Scope.shouldSkipIfSpecial;
                    howToRead.shouldLookForHelper = isSpecialRead ? false : true;
                    return this._walk(keyReads, options, howToRead);
                }
            },
            _walk: function (keyReads, options, howToRead) {
                var currentScope = this, currentContext, undefinedObserves = [], currentObserve, currentReads, setObserveDepth = -1, currentSetReads, currentSetObserve, readOptions = assign({
                        foundObservable: function (observe, nameIndex) {
                            currentObserve = observe;
                            currentReads = keyReads.slice(nameIndex);
                        },
                        earlyExit: function (parentValue, nameIndex) {
                            var isVariableScope = currentScope._meta.variable === true, updateSetObservable = false;
                            if (isVariableScope === true && nameIndex === 0) {
                                updateSetObservable = canReflect.hasKey(parentValue, keyReads[nameIndex].key);
                            } else {
                                updateSetObservable = nameIndex > setObserveDepth || nameIndex === setObserveDepth && (typeof parentValue === 'object' && canReflect.hasOwnKey(parentValue, keyReads[nameIndex].key));
                            }
                            if (updateSetObservable) {
                                currentSetObserve = currentObserve;
                                currentSetReads = currentReads;
                                setObserveDepth = nameIndex;
                            }
                        }
                    }, options);
                var isRecording = ObservationRecorder.isRecording(), readAContext = false;
                while (currentScope) {
                    if (howToRead.shouldSkip(currentScope) === true) {
                        currentScope = currentScope._parent;
                        continue;
                    }
                    if (howToRead.shouldExit(currentScope) === true) {
                        break;
                    }
                    readAContext = true;
                    currentContext = currentScope._context;
                    var getObserves = ObservationRecorder.trap();
                    var data = howToRead.read(currentContext, keyReads, readOptions);
                    var observes = getObserves();
                    if (data.value !== undefined || data.parentHasKey) {
                        if (!observes.length && isRecording) {
                            currentObserve = data.parent;
                            currentReads = keyReads.slice(keyReads.length - 1);
                        } else {
                            ObservationRecorder.addMany(observes);
                        }
                        return {
                            scope: currentScope,
                            rootObserve: currentObserve,
                            value: data.value,
                            reads: currentReads,
                            thisArg: data.parent,
                            parentHasKey: data.parentHasKey
                        };
                    } else {
                        undefinedObserves.push.apply(undefinedObserves, observes);
                    }
                    currentScope = currentScope._parent;
                }
                if (howToRead.shouldLookForHelper) {
                    var helper = this.getHelperOrPartial(keyReads);
                    if (helper && helper.value) {
                        return { value: helper.value };
                    }
                }
                ObservationRecorder.addMany(undefinedObserves);
                return {
                    setRoot: currentSetObserve,
                    reads: currentSetReads,
                    value: undefined,
                    noContextAvailable: !readAContext
                };
            },
            getDataForScopeSet: function getDataForScopeSet(key, options) {
                var keyInfo = Scope.keyInfo(key);
                var firstSearchedContext;
                var opts = assign({
                    read: function (context, keys) {
                        if (firstSearchedContext === undefined && !(context instanceof LetContext)) {
                            firstSearchedContext = context;
                        }
                        if (keys.length > 1) {
                            var parentKeys = keys.slice(0, keys.length - 1);
                            var parent = stacheKey.read(context, parentKeys, options).value;
                            if (parent != null && canReflect.hasKey(parent, keys[keys.length - 1].key)) {
                                return {
                                    parent: parent,
                                    parentHasKey: true,
                                    value: undefined
                                };
                            } else {
                                return {};
                            }
                        } else if (keys.length === 1) {
                            if (canReflect.hasKey(context, keys[0].key)) {
                                return {
                                    parent: context,
                                    parentHasKey: true,
                                    value: undefined
                                };
                            } else {
                                return {};
                            }
                        } else {
                            return { value: context };
                        }
                    }
                }, options);
                var readData = this.readKeyInfo(keyInfo, opts);
                if (keyInfo.remainingKey === 'this') {
                    return {
                        parent: readData.value,
                        how: 'setValue'
                    };
                }
                var parent;
                var props = keyInfo.remainingKey.split('.');
                var propName = props.pop();
                if (readData.thisArg) {
                    parent = readData.thisArg;
                } else if (firstSearchedContext) {
                    parent = firstSearchedContext;
                }
                if (parent === undefined) {
                    return { error: 'Attempting to set a value at ' + key + ' where the context is undefined.' };
                }
                if (!canReflect.isObservableLike(parent) && canReflect.isObservableLike(parent[propName])) {
                    if (canReflect.isMapLike(parent[propName])) {
                        return {
                            parent: parent,
                            key: propName,
                            how: 'updateDeep',
                            warn: 'can-view-scope: Merging data into "' + propName + '" because its parent is non-observable'
                        };
                    } else if (canReflect.isValueLike(parent[propName])) {
                        return {
                            parent: parent,
                            key: propName,
                            how: 'setValue'
                        };
                    } else {
                        return {
                            parent: parent,
                            how: 'write',
                            key: propName,
                            passOptions: true
                        };
                    }
                } else {
                    return {
                        parent: parent,
                        how: 'write',
                        key: propName,
                        passOptions: true
                    };
                }
            },
            getHelper: function (keyReads) {
                console.warn('.getHelper is deprecated, use .getHelperOrPartial');
                return this.getHelperOrPartial(keyReads);
            },
            getHelperOrPartial: function (keyReads) {
                var scope = this, context, helper;
                while (scope) {
                    context = scope._context;
                    if (context instanceof TemplateContext) {
                        helper = stacheKey.read(context.helpers, keyReads, { proxyMethods: false });
                        if (helper.value !== undefined) {
                            return helper;
                        }
                        helper = stacheKey.read(context.partials, keyReads, { proxyMethods: false });
                        if (helper.value !== undefined) {
                            return helper;
                        }
                    }
                    scope = scope._parent;
                }
                return stacheKey.read(stacheHelpers, keyReads, { proxyMethods: false });
            },
            get: function (key, options) {
                options = assign({ isArgument: true }, options);
                var res = this.read(key, options);
                return res.value;
            },
            peek: ObservationRecorder.ignore(function (key, options) {
                return this.get(key, options);
            }),
            peak: ObservationRecorder.ignore(function (key, options) {
                return this.peek(key, options);
            }),
            getScope: function (tester) {
                var scope = this;
                while (scope) {
                    if (tester(scope)) {
                        return scope;
                    }
                    scope = scope._parent;
                }
            },
            getContext: function (tester) {
                var res = this.getScope(tester);
                return res && res._context;
            },
            getTemplateContext: function () {
                var lastScope;
                var templateContext = this.getScope(function (scope) {
                    lastScope = scope;
                    return scope._context instanceof TemplateContext;
                });
                if (!templateContext) {
                    templateContext = new Scope(new TemplateContext());
                    lastScope._parent = templateContext;
                }
                return templateContext;
            },
            addTemplateContext: function () {
                return this.add(new TemplateContext());
            },
            addLetContext: function (values) {
                return this.add(new LetContext(values || {}), { variable: true });
            },
            getRoot: function () {
                var cur = this, child = this;
                while (cur._parent) {
                    child = cur;
                    cur = cur._parent;
                }
                if (cur._context instanceof TemplateContext) {
                    cur = child;
                }
                return cur._context;
            },
            getViewModel: function () {
                var vmScope = this.getScope(function (scope) {
                    return scope._meta.viewModel;
                });
                return vmScope && vmScope._context;
            },
            getTop: function () {
                var top;
                this.getScope(function (scope) {
                    if (scope._meta.viewModel) {
                        top = scope;
                    }
                    return false;
                });
                return top && top._context;
            },
            getPathsForKey: function getPathsForKey(key) {
            },
            hasKey: function hasKey(key) {
                var reads = stacheKey.reads(key);
                var readValue;
                if (reads[0].key === 'scope') {
                    readValue = stacheKey.read(this, reads.slice(1), key);
                } else {
                    readValue = stacheKey.read(this._context, reads, key);
                }
                return readValue.foundLastParent && readValue.parentHasKey;
            },
            set: function (key, value, options) {
                options = options || {};
                var data = this.getDataForScopeSet(key, options);
                var parent = data.parent;
                if (data.warn) {
                    canLog.warn(data.warn);
                }
                switch (data.how) {
                case 'set':
                    parent.set(data.key, value, data.passOptions ? options : undefined);
                    break;
                case 'write':
                    stacheKey.write(parent, data.key, value, options);
                    break;
                case 'setValue':
                    canReflect.setValue('key' in data ? parent[data.key] : parent, value);
                    break;
                case 'setKeyValue':
                    canReflect.setKeyValue(parent, data.key, value);
                    break;
                case 'updateDeep':
                    canReflect.updateDeep(parent[data.key], value);
                    break;
                }
            },
            attr: ObservationRecorder.ignore(function (key, value, options) {
                canLog.warn('can-view-scope::attr is deprecated, please use peek, get or set');
                options = assign({ isArgument: true }, options);
                if (arguments.length === 2) {
                    return this.set(key, value, options);
                } else {
                    return this.get(key, options);
                }
            }),
            computeData: function (key, options) {
                return makeComputeData(this, key, options);
            },
            compute: function (key, options) {
                return this.computeData(key, options).compute;
            },
            cloneFromRef: function () {
                var scopes = [];
                var scope = this, context, parent;
                while (scope) {
                    context = scope._context;
                    if (context instanceof TemplateContext) {
                        parent = scope._parent;
                        break;
                    }
                    scopes.unshift(scope);
                    scope = scope._parent;
                }
                if (parent) {
                    scopes.forEach(function (scope) {
                        parent = parent.add(scope._context, scope._meta);
                    });
                    return parent;
                } else {
                    return this;
                }
            },
            isSpecial: function () {
                return this._meta.notContext || this._meta.special || this._context instanceof TemplateContext || this._meta.variable;
            }
        });
        Scope.prototype._read = Scope.prototype._walk;
        canReflect.assignSymbols(Scope.prototype, { 'can.hasKey': Scope.prototype.hasKey });
        var templateContextPrimitives = [
            'filename',
            'lineNumber'
        ];
        templateContextPrimitives.forEach(function (key) {
            Object.defineProperty(Scope.prototype, key, {
                get: function () {
                    return this.readFromTemplateContext(key).value;
                },
                set: function (val) {
                    this.templateContext[key] = val;
                }
            });
        });
        defineLazyValue(Scope.prototype, 'templateContext', function () {
            return this.getTemplateContext()._context;
        });
        defineLazyValue(Scope.prototype, 'root', function () {
            canLog.warn('`scope.root` is deprecated. Use either `scope.top` or `scope.vm` instead.');
            return this.getRoot();
        });
        defineLazyValue(Scope.prototype, 'vm', function () {
            return this.getViewModel();
        });
        defineLazyValue(Scope.prototype, 'top', function () {
            return this.getTop();
        });
        defineLazyValue(Scope.prototype, 'helpers', function () {
            return stacheHelpers;
        });
        var specialKeywords = [
            'index',
            'key',
            'element',
            'event',
            'viewModel',
            'arguments',
            'helperOptions'
        ];
        specialKeywords.forEach(function (key) {
            Object.defineProperty(Scope.prototype, key, {
                get: function () {
                    return this.readFromSpecialContext(key).value;
                }
            });
        });
        namespace.view = namespace.view || {};
        module.exports = namespace.view.Scope = Scope;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-simple-observable@2.4.0#settable/settable*/
define('can-simple-observable@2.4.0#settable/settable', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-observation-recorder',
    '../can-simple-observable',
    'can-observation',
    'can-queues',
    '../log',
    'can-event-queue/value/value'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var ObservationRecorder = require('can-observation-recorder');
    var SimpleObservable = require('../can-simple-observable');
    var Observation = require('can-observation');
    var queues = require('can-queues');
    var log = require('../log');
    var valueEventBindings = require('can-event-queue/value/value');
    var peek = ObservationRecorder.ignore(canReflect.getValue.bind(canReflect));
    function SettableObservable(fn, context, initialValue) {
        this.lastSetValue = new SimpleObservable(initialValue);
        function observe() {
            return fn.call(context, this.lastSetValue.get());
        }
        this.handler = this.handler.bind(this);
        this.observation = new Observation(observe, this);
    }
    valueEventBindings(SettableObservable.prototype);
    canReflect.assignMap(SettableObservable.prototype, {
        log: log,
        constructor: SettableObservable,
        handler: function (newVal) {
            var old = this._value, reasonLog;
            this._value = newVal;
            queues.enqueueByQueue(this.handlers.getNode([]), this, [
                newVal,
                old
            ], null, reasonLog);
        },
        onBound: function () {
            if (!this.bound) {
                this.bound = true;
                this.activate();
            }
        },
        activate: function () {
            canReflect.onValue(this.observation, this.handler, 'notify');
            this._value = peek(this.observation);
        },
        onUnbound: function () {
            this.bound = false;
            canReflect.offValue(this.observation, this.handler, 'notify');
        },
        set: function (newVal) {
            var oldVal = this.lastSetValue.get();
            if (canReflect.isObservableLike(oldVal) && canReflect.isValueLike(oldVal) && !canReflect.isObservableLike(newVal)) {
                canReflect.setValue(oldVal, newVal);
            } else {
                if (newVal !== oldVal) {
                    this.lastSetValue.set(newVal);
                }
            }
        },
        get: function () {
            if (ObservationRecorder.isRecording()) {
                ObservationRecorder.add(this);
                if (!this.bound) {
                    this.onBound();
                }
            }
            if (this.bound === true) {
                return this._value;
            } else {
                return this.observation.get();
            }
        },
        hasDependencies: function () {
            return canReflect.valueHasDependencies(this.observation);
        },
        getValueDependencies: function () {
            return canReflect.getValueDependencies(this.observation);
        }
    });
    Object.defineProperty(SettableObservable.prototype, 'value', {
        set: function (value) {
            return this.set(value);
        },
        get: function () {
            return this.get();
        }
    });
    canReflect.assignSymbols(SettableObservable.prototype, {
        'can.getValue': SettableObservable.prototype.get,
        'can.setValue': SettableObservable.prototype.set,
        'can.isMapLike': false,
        'can.getPriority': function () {
            return canReflect.getPriority(this.observation);
        },
        'can.setPriority': function (newPriority) {
            canReflect.setPriority(this.observation, newPriority);
        },
        'can.valueHasDependencies': SettableObservable.prototype.hasDependencies,
        'can.getValueDependencies': SettableObservable.prototype.getValueDependencies
    });
    module.exports = SettableObservable;
});
/*can-stache@4.15.1#src/key-observable*/
define('can-stache@4.15.1#src/key-observable', [
    'require',
    'exports',
    'module',
    'can-simple-observable/settable/settable',
    'can-stache-key'
], function (require, exports, module) {
    'use strict';
    var SettableObservable = require('can-simple-observable/settable/settable');
    var stacheKey = require('can-stache-key');
    function KeyObservable(root, key) {
        key = '' + key;
        this.key = key;
        this.root = root;
        SettableObservable.call(this, function () {
            return stacheKey.get(this, key);
        }, root);
    }
    KeyObservable.prototype = Object.create(SettableObservable.prototype);
    KeyObservable.prototype.set = function (newVal) {
        stacheKey.set(this.root, this.key, newVal);
    };
    module.exports = KeyObservable;
});
/*can-stache@4.15.1#src/utils*/
define('can-stache@4.15.1#src/utils', [
    'require',
    'exports',
    'module',
    'can-view-scope',
    'can-observation-recorder',
    'can-stache-key',
    'can-reflect',
    './key-observable',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var Scope = require('can-view-scope');
    var ObservationRecorder = require('can-observation-recorder');
    var observationReader = require('can-stache-key');
    var canReflect = require('can-reflect');
    var KeyObservable = require('./key-observable');
    var canSymbol = require('can-symbol');
    var isViewSymbol = canSymbol.for('can.isView');
    var createNoOpRenderer = function (metadata) {
        return function noop() {
            if (metadata) {
                metadata.rendered = true;
            }
        };
    };
    module.exports = {
        last: function (arr) {
            return arr != null && arr[arr.length - 1];
        },
        emptyHandler: function () {
        },
        jsonParse: function (str) {
            if (str[0] === '\'') {
                return str.substr(1, str.length - 2);
            } else if (str === 'undefined') {
                return undefined;
            } else {
                return JSON.parse(str);
            }
        },
        mixins: {
            last: function () {
                return this.stack[this.stack.length - 1];
            },
            add: function (chars) {
                this.last().add(chars);
            },
            subSectionDepth: function () {
                return this.stack.length - 1;
            }
        },
        createRenderers: function (helperOptions, scope, nodeList, truthyRenderer, falseyRenderer, isStringOnly) {
            helperOptions.fn = truthyRenderer ? this.makeRendererConvertScopes(truthyRenderer, scope, nodeList, isStringOnly, helperOptions.metadata) : createNoOpRenderer(helperOptions.metadata);
            helperOptions.inverse = falseyRenderer ? this.makeRendererConvertScopes(falseyRenderer, scope, nodeList, isStringOnly, helperOptions.metadata) : createNoOpRenderer(helperOptions.metadata);
            helperOptions.isSection = !!(truthyRenderer || falseyRenderer);
        },
        makeRendererConvertScopes: function (renderer, parentScope, nodeList, observeObservables, metadata) {
            var convertedRenderer = function (newScope, newOptions, parentNodeList) {
                if (newScope !== undefined && !(newScope instanceof Scope)) {
                    if (parentScope) {
                        newScope = parentScope.add(newScope);
                    } else {
                        newScope = new Scope(newScope || {});
                    }
                }
                if (metadata) {
                    metadata.rendered = true;
                }
                var result = renderer(newScope || parentScope, parentNodeList || nodeList);
                return result;
            };
            return observeObservables ? convertedRenderer : ObservationRecorder.ignore(convertedRenderer);
        },
        makeView: function (renderer) {
            var view = ObservationRecorder.ignore(function (scope, nodeList) {
                if (!(scope instanceof Scope)) {
                    scope = new Scope(scope);
                }
                return renderer(scope, nodeList);
            });
            view[isViewSymbol] = true;
            return view;
        },
        getItemsStringContent: function (items, isObserveList, helperOptions) {
            var txt = '', len = observationReader.get(items, 'length'), isObservable = canReflect.isObservableLike(items);
            for (var i = 0; i < len; i++) {
                var item = isObservable ? new KeyObservable(items, i) : items[i];
                txt += helperOptions.fn(item);
            }
            return txt;
        },
        getItemsFragContent: function (items, helperOptions, scope) {
            var result = [], len = observationReader.get(items, 'length'), isObservable = canReflect.isObservableLike(items), hashExprs = helperOptions.exprData && helperOptions.exprData.hashExprs, hashOptions;
            if (canReflect.size(hashExprs) > 0) {
                hashOptions = {};
                canReflect.eachKey(hashExprs, function (exprs, key) {
                    hashOptions[exprs.key] = key;
                });
            }
            for (var i = 0; i < len; i++) {
                var aliases = {};
                var item = isObservable ? new KeyObservable(items, i) : items[i];
                if (canReflect.size(hashOptions) > 0) {
                    if (hashOptions.value) {
                        aliases[hashOptions.value] = item;
                    }
                    if (hashOptions.index) {
                        aliases[hashOptions.index] = i;
                    }
                }
                result.push(helperOptions.fn(scope.add(aliases, { notContext: true }).add({ index: i }, { special: true }).add(item)));
            }
            return result;
        }
    };
});
/*can-stache@4.15.1#src/html_section*/
define('can-stache@4.15.1#src/html_section', [
    'require',
    'exports',
    'module',
    'can-view-target',
    './utils',
    'can-globals/document/document',
    'can-assign'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var target = require('can-view-target');
        var utils = require('./utils');
        var getDocument = require('can-globals/document/document');
        var assign = require('can-assign');
        var last = utils.last;
        var decodeHTML = typeof document !== 'undefined' && function () {
            var el = getDocument().createElement('div');
            return function (html) {
                if (html.indexOf('&') === -1) {
                    return html.replace(/\r\n/g, '\n');
                }
                el.innerHTML = html;
                return el.childNodes.length === 0 ? '' : el.childNodes.item(0).nodeValue;
            };
        }();
        var HTMLSectionBuilder = function (filename) {
            if (filename) {
                this.filename = filename;
            }
            this.stack = [new HTMLSection()];
        };
        assign(HTMLSectionBuilder.prototype, utils.mixins);
        assign(HTMLSectionBuilder.prototype, {
            startSubSection: function (process) {
                var newSection = new HTMLSection(process);
                this.stack.push(newSection);
                return newSection;
            },
            endSubSectionAndReturnRenderer: function () {
                if (this.last().isEmpty()) {
                    this.stack.pop();
                    return null;
                } else {
                    var htmlSection = this.endSection();
                    return utils.makeView(htmlSection.compiled.hydrate.bind(htmlSection.compiled));
                }
            },
            startSection: function (process) {
                var newSection = new HTMLSection(process);
                this.last().add(newSection.targetCallback);
                this.stack.push(newSection);
            },
            endSection: function () {
                this.last().compile();
                return this.stack.pop();
            },
            inverse: function () {
                this.last().inverse();
            },
            compile: function () {
                var compiled = this.stack.pop().compile();
                return utils.makeView(compiled.hydrate.bind(compiled));
            },
            push: function (chars) {
                this.last().push(chars);
            },
            pop: function () {
                return this.last().pop();
            },
            removeCurrentNode: function () {
                this.last().removeCurrentNode();
            }
        });
        var HTMLSection = function (process) {
            this.data = 'targetData';
            this.targetData = [];
            this.targetStack = [];
            var self = this;
            this.targetCallback = function (scope, sectionNode) {
                process.call(this, scope, sectionNode, self.compiled.hydrate.bind(self.compiled), self.inverseCompiled && self.inverseCompiled.hydrate.bind(self.inverseCompiled));
            };
        };
        assign(HTMLSection.prototype, {
            inverse: function () {
                this.inverseData = [];
                this.data = 'inverseData';
            },
            push: function (data) {
                this.add(data);
                this.targetStack.push(data);
            },
            pop: function () {
                return this.targetStack.pop();
            },
            add: function (data) {
                if (typeof data === 'string') {
                    data = decodeHTML(data);
                }
                if (this.targetStack.length) {
                    last(this.targetStack).children.push(data);
                } else {
                    this[this.data].push(data);
                }
            },
            compile: function () {
                this.compiled = target(this.targetData, getDocument());
                if (this.inverseData) {
                    this.inverseCompiled = target(this.inverseData, getDocument());
                    delete this.inverseData;
                }
                this.targetStack = this.targetData = null;
                return this.compiled;
            },
            removeCurrentNode: function () {
                var children = this.children();
                return children.pop();
            },
            children: function () {
                if (this.targetStack.length) {
                    return last(this.targetStack).children;
                } else {
                    return this[this.data];
                }
            },
            isEmpty: function () {
                return !this.targetData.length;
            }
        });
        HTMLSectionBuilder.HTMLSection = HTMLSection;
        module.exports = HTMLSectionBuilder;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-live@4.2.6#lib/core*/
define('can-view-live@4.2.6#lib/core', [
    'require',
    'exports',
    'module',
    'can-view-parser',
    'can-dom-mutate',
    'can-view-nodelist',
    'can-fragment',
    'can-child-nodes',
    'can-reflect',
    'can-reflect-dependencies'
], function (require, exports, module) {
    'use strict';
    var parser = require('can-view-parser');
    var domMutate = require('can-dom-mutate');
    var nodeLists = require('can-view-nodelist');
    var makeFrag = require('can-fragment');
    var childNodes = require('can-child-nodes');
    var canReflect = require('can-reflect');
    var canReflectDeps = require('can-reflect-dependencies');
    function contains(parent, child) {
        if (parent.contains) {
            return parent.contains(child);
        }
        if (parent.nodeType === Node.DOCUMENT_NODE && parent.documentElement) {
            return contains(parent.documentElement, child);
        } else {
            child = child.parentNode;
            if (child === parent) {
                return true;
            }
            return false;
        }
    }
    var live = {
        setup: function (el, bind, unbind) {
            var tornDown = false, removalDisposal, data, teardown = function () {
                    if (!tornDown) {
                        tornDown = true;
                        unbind(data);
                        if (removalDisposal) {
                            removalDisposal();
                            removalDisposal = undefined;
                        }
                    }
                    return true;
                };
            data = {
                teardownCheck: function (parent) {
                    return parent ? false : teardown();
                }
            };
            removalDisposal = domMutate.onNodeRemoval(el, function () {
                var doc = el.ownerDocument;
                if (!contains(doc, el)) {
                    teardown();
                }
            });
            bind(data);
            return data;
        },
        listen: function (el, compute, change, queueName) {
            return live.setup(el, function bind() {
                canReflect.onValue(compute, change, queueName || 'notify');
            }, function unbind(data) {
                canReflect.offValue(compute, change, queueName || 'notify');
                if (data.nodeList) {
                    nodeLists.unregister(data.nodeList);
                }
            });
        },
        getAttributeParts: function (newVal) {
            var attrs = {}, attr;
            parser.parseAttrs(newVal, {
                attrStart: function (name) {
                    attrs[name] = '';
                    attr = name;
                },
                attrValue: function (value) {
                    attrs[attr] += value;
                },
                attrEnd: function () {
                }
            });
            return attrs;
        },
        isNode: function (obj) {
            return obj && obj.nodeType;
        },
        addTextNodeIfNoChildren: function (frag) {
            if (!frag.firstChild) {
                frag.appendChild(frag.ownerDocument.createTextNode(''));
            }
        },
        replace: function (nodes, val, teardown) {
            var oldNodes = nodes.slice(0), frag = makeFrag(val);
            nodeLists.register(nodes, teardown);
            nodeLists.update(nodes, childNodes(frag));
            nodeLists.replace(oldNodes, frag);
            return nodes;
        },
        getParentNode: function (el, defaultParentNode) {
            return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
        },
        makeString: function (txt) {
            return txt == null ? '' : '' + txt;
        }
    };
    module.exports = live;
});
/*can-dom-data-state@1.0.2#can-dom-data-state*/
define('can-dom-data-state@1.0.2#can-dom-data-state', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-dom-mutate',
    'can-cid'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var domMutate = require('can-dom-mutate');
    var CID = require('can-cid');
    var isEmptyObject = function (obj) {
        for (var prop in obj) {
            return false;
        }
        return true;
    };
    var data = {};
    var removedDisposalMap = {};
    var deleteNode = function () {
        var id = CID.get(this);
        var nodeDeleted = false;
        if (id && data[id]) {
            nodeDeleted = true;
            delete data[id];
        }
        if (removedDisposalMap[id]) {
            removedDisposalMap[id]();
            delete removedDisposalMap[id];
        }
        return nodeDeleted;
    };
    var setData = function (name, value) {
        var id = CID(this);
        var store = data[id] || (data[id] = {});
        if (name !== undefined) {
            store[name] = value;
            var isNode = !!(this && typeof this.nodeType === 'number');
            if (isNode && !removedDisposalMap[id]) {
                var target = this;
                removedDisposalMap[id] = domMutate.onNodeRemoval(target, function () {
                    if (!target.ownerDocument.contains(target)) {
                        setTimeout(function () {
                            deleteNode.call(target);
                        }, 13);
                    }
                });
            }
        }
        return store;
    };
    var domDataState = {
        _data: data,
        _removalDisposalMap: removedDisposalMap,
        getCid: function () {
            return CID.get(this);
        },
        cid: function () {
            return CID(this);
        },
        expando: CID.domExpando,
        get: function (key) {
            var id = CID.get(this), store = id && data[id];
            return key === undefined ? store : store && store[key];
        },
        set: setData,
        clean: function (prop) {
            var id = CID.get(this);
            var itemData = data[id];
            if (itemData && itemData[prop]) {
                delete itemData[prop];
            }
            if (isEmptyObject(itemData)) {
                deleteNode.call(this);
            }
        },
        delete: deleteNode
    };
    if (namespace.domDataState) {
        throw new Error('You can\'t have two versions of can-dom-data-state, check your dependencies');
    } else {
        module.exports = namespace.domDataState = domDataState;
    }
});
/*can-diff@1.4.2#list/list*/
define('can-diff@1.4.2#list/list', [
    'require',
    'exports',
    'module',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var slice = [].slice;
    function defaultIdentity(a, b) {
        return a === b;
    }
    function makeIdentityFromMapSchema(typeSchema) {
        if (typeSchema.identity && typeSchema.identity.length) {
            return function identityCheck(a, b) {
                var aId = canReflect.getIdentity(a, typeSchema), bId = canReflect.getIdentity(b, typeSchema);
                return aId === bId;
            };
        } else {
            return defaultIdentity;
        }
    }
    function makeIdentityFromListSchema(listSchema) {
        return listSchema.values != null ? makeIdentityFromMapSchema(canReflect.getSchema(listSchema.values)) : defaultIdentity;
    }
    function makeIdentity(oldList, oldListLength) {
        var listSchema = canReflect.getSchema(oldList), typeSchema;
        if (listSchema != null) {
            if (listSchema.values != null) {
                typeSchema = canReflect.getSchema(listSchema.values);
            } else {
                return defaultIdentity;
            }
        }
        if (typeSchema == null && oldListLength > 0) {
            typeSchema = canReflect.getSchema(canReflect.getKeyValue(oldList, 0));
        }
        if (typeSchema) {
            return makeIdentityFromMapSchema(typeSchema);
        } else {
            return defaultIdentity;
        }
    }
    function reverseDiff(oldDiffStopIndex, newDiffStopIndex, oldList, newList, identity) {
        var oldIndex = oldList.length - 1, newIndex = newList.length - 1;
        while (oldIndex > oldDiffStopIndex && newIndex > newDiffStopIndex) {
            var oldItem = oldList[oldIndex], newItem = newList[newIndex];
            if (identity(oldItem, newItem, oldIndex)) {
                oldIndex--;
                newIndex--;
                continue;
            } else {
                return [{
                        type: 'splice',
                        index: newDiffStopIndex,
                        deleteCount: oldIndex - oldDiffStopIndex + 1,
                        insert: slice.call(newList, newDiffStopIndex, newIndex + 1)
                    }];
            }
        }
        return [{
                type: 'splice',
                index: newDiffStopIndex,
                deleteCount: oldIndex - oldDiffStopIndex + 1,
                insert: slice.call(newList, newDiffStopIndex, newIndex + 1)
            }];
    }
    module.exports = function (oldList, newList, schemaOrIdentity) {
        var oldIndex = 0, newIndex = 0, oldLength = canReflect.size(oldList), newLength = canReflect.size(newList), patches = [];
        var schemaType = typeof schemaOrIdentity, identity;
        if (schemaType === 'function') {
            identity = schemaOrIdentity;
        } else if (schemaOrIdentity != null) {
            if (schemaOrIdentity.type === 'map') {
                identity = makeIdentityFromMapSchema(schemaOrIdentity);
            } else {
                identity = makeIdentityFromListSchema(schemaOrIdentity);
            }
        } else {
            identity = makeIdentity(oldList, oldLength);
        }
        while (oldIndex < oldLength && newIndex < newLength) {
            var oldItem = oldList[oldIndex], newItem = newList[newIndex];
            if (identity(oldItem, newItem, oldIndex)) {
                oldIndex++;
                newIndex++;
                continue;
            }
            if (newIndex + 1 < newLength && identity(oldItem, newList[newIndex + 1], oldIndex)) {
                patches.push({
                    index: newIndex,
                    deleteCount: 0,
                    insert: [newList[newIndex]],
                    type: 'splice'
                });
                oldIndex++;
                newIndex += 2;
                continue;
            } else if (oldIndex + 1 < oldLength && identity(oldList[oldIndex + 1], newItem, oldIndex + 1)) {
                patches.push({
                    index: newIndex,
                    deleteCount: 1,
                    insert: [],
                    type: 'splice'
                });
                oldIndex += 2;
                newIndex++;
                continue;
            } else {
                patches.push.apply(patches, reverseDiff(oldIndex, newIndex, oldList, newList, identity));
                return patches;
            }
        }
        if (newIndex === newLength && oldIndex === oldLength) {
            return patches;
        }
        patches.push({
            type: 'splice',
            index: newIndex,
            deleteCount: oldLength - oldIndex,
            insert: slice.call(newList, newIndex)
        });
        return patches;
    };
});
/*can-attribute-observable@1.1.5#behaviors*/
define('can-attribute-observable@1.1.5#behaviors', [
    'require',
    'exports',
    'module',
    'can-globals/document/document',
    'can-globals/global/global',
    'can-dom-data-state',
    'can-dom-events',
    'can-dom-mutate',
    'can-dom-mutate/node',
    'can-globals/mutation-observer/mutation-observer',
    'can-diff/list/list',
    'can-queues'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getDocument = require('can-globals/document/document');
        var global = require('can-globals/global/global')();
        var setData = require('can-dom-data-state');
        var domEvents = require('can-dom-events');
        var domMutate = require('can-dom-mutate');
        var domMutateNode = require('can-dom-mutate/node');
        var getMutationObserver = require('can-globals/mutation-observer/mutation-observer');
        var diff = require('can-diff/list/list');
        var queues = require('can-queues');
        var formElements = {
                'INPUT': true,
                'TEXTAREA': true,
                'SELECT': true
            }, toString = function (value) {
                if (value == null) {
                    return '';
                } else {
                    return '' + value;
                }
            }, isSVG = function (el) {
                return el.namespaceURI === 'http://www.w3.org/2000/svg';
            }, truthy = function () {
                return true;
            }, getSpecialTest = function (special) {
                return special && special.test || truthy;
            }, propProp = function (prop, obj) {
                obj = obj || {};
                obj.get = function () {
                    return this[prop];
                };
                obj.set = function (value) {
                    if (this[prop] !== value) {
                        this[prop] = value;
                    }
                };
                return obj;
            }, booleanProp = function (prop) {
                return {
                    isBoolean: true,
                    set: function (value) {
                        if (prop in this) {
                            this[prop] = value;
                        } else {
                            domMutateNode.setAttribute.call(this, prop, '');
                        }
                    },
                    remove: function () {
                        this[prop] = false;
                    }
                };
            }, setupMO = function (el, callback) {
                var attrMO = setData.get.call(el, 'attrMO');
                if (!attrMO) {
                    var onMutation = function () {
                        callback.call(el);
                    };
                    var MO = getMutationObserver();
                    if (MO) {
                        var observer = new MO(onMutation);
                        observer.observe(el, {
                            childList: true,
                            subtree: true
                        });
                        setData.set.call(el, 'attrMO', observer);
                    } else {
                        setData.set.call(el, 'attrMO', true);
                        setData.set.call(el, 'canBindingCallback', { onMutation: onMutation });
                    }
                }
            }, _findOptionToSelect = function (parent, value) {
                var child = parent.firstChild;
                while (child) {
                    if (child.nodeName === 'OPTION' && value === child.value) {
                        return child;
                    }
                    if (child.nodeName === 'OPTGROUP') {
                        var groupChild = _findOptionToSelect(child, value);
                        if (groupChild) {
                            return groupChild;
                        }
                    }
                    child = child.nextSibling;
                }
            }, setChildOptions = function (el, value) {
                var option;
                if (value != null) {
                    option = _findOptionToSelect(el, value);
                }
                if (option) {
                    option.selected = true;
                } else {
                    el.selectedIndex = -1;
                }
            }, forEachOption = function (parent, fn) {
                var child = parent.firstChild;
                while (child) {
                    if (child.nodeName === 'OPTION') {
                        fn(child);
                    }
                    if (child.nodeName === 'OPTGROUP') {
                        forEachOption(child, fn);
                    }
                    child = child.nextSibling;
                }
            }, collectSelectedOptions = function (parent) {
                var selectedValues = [];
                forEachOption(parent, function (option) {
                    if (option.selected) {
                        selectedValues.push(option.value);
                    }
                });
                return selectedValues;
            }, markSelectedOptions = function (parent, values) {
                forEachOption(parent, function (option) {
                    option.selected = values.indexOf(option.value) !== -1;
                });
            }, setChildOptionsOnChange = function (select, aEL) {
                var handler = setData.get.call(select, 'attrSetChildOptions');
                if (handler) {
                    return Function.prototype;
                }
                handler = function () {
                    setChildOptions(select, select.value);
                };
                setData.set.call(select, 'attrSetChildOptions', handler);
                aEL.call(select, 'change', handler);
                return function (rEL) {
                    setData.clean.call(select, 'attrSetChildOptions');
                    rEL.call(select, 'change', handler);
                };
            }, behaviorRules = new Map(), isPropWritable = function (el, prop) {
                var desc = Object.getOwnPropertyDescriptor(el, prop);
                if (desc) {
                    return desc.writable || desc.set;
                } else {
                    var proto = Object.getPrototypeOf(el);
                    if (proto) {
                        return isPropWritable(proto, prop);
                    }
                }
                return false;
            }, cacheRule = function (el, attrOrPropName, rule) {
                var rulesForElementType;
                rulesForElementType = behaviorRules.get(el.prototype);
                if (!rulesForElementType) {
                    rulesForElementType = {};
                    behaviorRules.set(el.constructor, rulesForElementType);
                }
                rulesForElementType[attrOrPropName] = rule;
                return rule;
            };
        var specialAttributes = {
            checked: {
                get: function () {
                    return this.checked;
                },
                set: function (val) {
                    var notFalse = !!val || val === '' || arguments.length === 0;
                    this.checked = notFalse;
                    if (notFalse && this.type === 'radio') {
                        this.defaultChecked = true;
                    }
                },
                remove: function () {
                    this.checked = false;
                },
                test: function () {
                    return this.nodeName === 'INPUT';
                }
            },
            'class': {
                get: function () {
                    if (isSVG(this)) {
                        return this.getAttribute('class');
                    }
                    return this.className;
                },
                set: function (val) {
                    val = val || '';
                    if (isSVG(this)) {
                        domMutateNode.setAttribute.call(this, 'class', '' + val);
                    } else {
                        this.className = val;
                    }
                }
            },
            disabled: booleanProp('disabled'),
            focused: {
                get: function () {
                    return this === document.activeElement;
                },
                set: function (val) {
                    var cur = attr.get(this, 'focused');
                    var docEl = this.ownerDocument.documentElement;
                    var element = this;
                    function focusTask() {
                        if (val) {
                            element.focus();
                        } else {
                            element.blur();
                        }
                    }
                    if (cur !== val) {
                        if (!docEl.contains(element)) {
                            var insertionDisposal = domMutate.onNodeInsertion(element, function () {
                                insertionDisposal();
                                focusTask();
                            });
                        } else {
                            queues.enqueueByQueue({ mutate: [focusTask] }, null, []);
                        }
                    }
                    return true;
                },
                addEventListener: function (eventName, handler, aEL) {
                    aEL.call(this, 'focus', handler);
                    aEL.call(this, 'blur', handler);
                    return function (rEL) {
                        rEL.call(this, 'focus', handler);
                        rEL.call(this, 'blur', handler);
                    };
                },
                test: function () {
                    return this.nodeName === 'INPUT';
                }
            },
            'for': propProp('htmlFor'),
            innertext: propProp('innerText'),
            innerhtml: propProp('innerHTML'),
            innerHTML: propProp('innerHTML', {
                addEventListener: function (eventName, handler, aEL) {
                    var handlers = [];
                    var el = this;
                    [
                        'change',
                        'blur'
                    ].forEach(function (eventName) {
                        var localHandler = function () {
                            handler.apply(this, arguments);
                        };
                        domEvents.addEventListener(el, eventName, localHandler);
                        handlers.push([
                            eventName,
                            localHandler
                        ]);
                    });
                    return function (rEL) {
                        handlers.forEach(function (info) {
                            rEL.call(el, info[0], info[1]);
                        });
                    };
                }
            }),
            required: booleanProp('required'),
            readonly: booleanProp('readOnly'),
            selected: {
                get: function () {
                    return this.selected;
                },
                set: function (val) {
                    val = !!val;
                    setData.set.call(this, 'lastSetValue', val);
                    this.selected = val;
                },
                addEventListener: function (eventName, handler, aEL) {
                    var option = this;
                    var select = this.parentNode;
                    var lastVal = option.selected;
                    var localHandler = function (changeEvent) {
                        var curVal = option.selected;
                        lastVal = setData.get.call(option, 'lastSetValue') || lastVal;
                        if (curVal !== lastVal) {
                            lastVal = curVal;
                            domEvents.dispatch(option, eventName);
                        }
                    };
                    var removeChangeHandler = setChildOptionsOnChange(select, aEL);
                    domEvents.addEventListener(select, 'change', localHandler);
                    aEL.call(option, eventName, handler);
                    return function (rEL) {
                        removeChangeHandler(rEL);
                        domEvents.removeEventListener(select, 'change', localHandler);
                        rEL.call(option, eventName, handler);
                    };
                },
                test: function () {
                    return this.nodeName === 'OPTION' && this.parentNode && this.parentNode.nodeName === 'SELECT';
                }
            },
            style: {
                set: function () {
                    var el = global.document && getDocument().createElement('div');
                    if (el && el.style && 'cssText' in el.style) {
                        return function (val) {
                            this.style.cssText = val || '';
                        };
                    } else {
                        return function (val) {
                            domMutateNode.setAttribute.call(this, 'style', val);
                        };
                    }
                }()
            },
            textcontent: propProp('textContent'),
            value: {
                get: function () {
                    var value = this.value;
                    if (this.nodeName === 'SELECT') {
                        if ('selectedIndex' in this && this.selectedIndex === -1) {
                            value = undefined;
                        }
                    }
                    return value;
                },
                set: function (value) {
                    var nodeName = this.nodeName.toLowerCase();
                    if (nodeName === 'input') {
                        value = toString(value);
                    }
                    if (this.value !== value || nodeName === 'option') {
                        this.value = value;
                    }
                    if (nodeName === 'input' || nodeName === 'textarea') {
                        this.defaultValue = value;
                    }
                    if (nodeName === 'select') {
                        setData.set.call(this, 'attrValueLastVal', value);
                        setChildOptions(this, value === null ? value : this.value);
                        var docEl = this.ownerDocument.documentElement;
                        if (!docEl.contains(this)) {
                            var select = this;
                            var insertionDisposal = domMutate.onNodeInsertion(select, function () {
                                insertionDisposal();
                                setChildOptions(select, value === null ? value : select.value);
                            });
                        }
                        setupMO(this, function () {
                            var value = setData.get.call(this, 'attrValueLastVal');
                            attr.set(this, 'value', value);
                            domEvents.dispatch(this, 'change');
                        });
                    }
                },
                test: function () {
                    return formElements[this.nodeName];
                }
            },
            values: {
                get: function () {
                    return collectSelectedOptions(this);
                },
                set: function (values) {
                    values = values || [];
                    markSelectedOptions(this, values);
                    setData.set.call(this, 'stickyValues', attr.get(this, 'values'));
                    setupMO(this, function () {
                        var previousValues = setData.get.call(this, 'stickyValues');
                        attr.set(this, 'values', previousValues);
                        var currentValues = setData.get.call(this, 'stickyValues');
                        var changes = diff(previousValues.slice().sort(), currentValues.slice().sort());
                        if (changes.length) {
                            domEvents.dispatch(this, 'values');
                        }
                    });
                },
                addEventListener: function (eventName, handler, aEL) {
                    var localHandler = function () {
                        domEvents.dispatch(this, 'values');
                    };
                    domEvents.addEventListener(this, 'change', localHandler);
                    aEL.call(this, eventName, handler);
                    return function (rEL) {
                        domEvents.removeEventListener(this, 'change', localHandler);
                        rEL.call(this, eventName, handler);
                    };
                }
            }
        };
        var attr = {
            rules: behaviorRules,
            specialAttributes: specialAttributes,
            getRule: function (el, attrOrPropName) {
                var special = specialAttributes[attrOrPropName];
                if (special) {
                    return special;
                }
                var rulesForElementType = behaviorRules.get(el.constructor);
                var cached = rulesForElementType && rulesForElementType[attrOrPropName];
                if (cached) {
                    return cached;
                }
                if (!(attrOrPropName in el)) {
                    return this.attribute(attrOrPropName);
                }
                var newRule = isPropWritable(el, attrOrPropName) ? this.property(attrOrPropName) : this.attribute(attrOrPropName);
                return cacheRule(el, attrOrPropName, newRule);
            },
            attribute: function (attrName) {
                return {
                    get: function () {
                        return this.getAttribute(attrName);
                    },
                    set: function (val) {
                        domMutateNode.setAttribute.call(this, attrName, val);
                    }
                };
            },
            property: function (propName) {
                return {
                    get: function () {
                        return this[propName];
                    },
                    set: function (val) {
                        this[propName] = val;
                    }
                };
            },
            findSpecialListener: function (attributeName) {
                return specialAttributes[attributeName] && specialAttributes[attributeName].addEventListener;
            },
            setAttrOrProp: function (el, attrName, val) {
                return this.set(el, attrName, val);
            },
            set: function (el, attrName, val) {
                var rule = this.getRule(el, attrName);
                var setter = rule && rule.set;
                if (setter) {
                    return setter.call(el, val);
                }
            },
            get: function (el, attrName) {
                var rule = this.getRule(el, attrName);
                var getter = rule && rule.get;
                if (getter) {
                    return rule.test ? rule.test.call(el) && getter.call(el) : getter.call(el);
                }
            },
            remove: function (el, attrName) {
                attrName = attrName.toLowerCase();
                var special = specialAttributes[attrName];
                var setter = special && special.set;
                var remover = special && special.remove;
                var test = getSpecialTest(special);
                if (typeof remover === 'function' && test.call(el)) {
                    remover.call(el);
                } else if (typeof setter === 'function' && test.call(el)) {
                    setter.call(el, undefined);
                } else {
                    domMutateNode.removeAttribute.call(el, attrName);
                }
            }
        };
        module.exports = attr;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-live@4.2.6#lib/attr*/
define('can-view-live@4.2.6#lib/attr', [
    'require',
    'exports',
    'module',
    './core',
    'can-reflect',
    'can-queues',
    'can-attribute-observable/behaviors'
], function (require, exports, module) {
    'use strict';
    var live = require('./core');
    var canReflect = require('can-reflect');
    var queues = require('can-queues');
    var attr = require('can-attribute-observable/behaviors');
    live.attr = function (el, attributeName, compute) {
        function liveUpdateAttr(newVal) {
            queues.domUIQueue.enqueue(attr.set, attr, [
                el,
                attributeName,
                newVal
            ]);
        }
        live.listen(el, compute, liveUpdateAttr);
        attr.set(el, attributeName, canReflect.getValue(compute));
    };
});
/*can-view-live@4.2.6#lib/attrs*/
define('can-view-live@4.2.6#lib/attrs', [
    'require',
    'exports',
    'module',
    './core',
    'can-view-callbacks',
    'can-dom-mutate',
    'can-dom-mutate/node',
    'can-reflect',
    'can-reflect-dependencies'
], function (require, exports, module) {
    'use strict';
    var live = require('./core');
    var viewCallbacks = require('can-view-callbacks');
    var domMutate = require('can-dom-mutate');
    var domMutateNode = require('can-dom-mutate/node');
    var canReflect = require('can-reflect');
    var canReflectDeps = require('can-reflect-dependencies');
    live.attrs = function (el, compute, scope, options) {
        if (!canReflect.isObservableLike(compute)) {
            var attrs = live.getAttributeParts(compute);
            for (var name in attrs) {
                domMutateNode.setAttribute.call(el, name, attrs[name]);
            }
            return;
        }
        var oldAttrs = {};
        function liveAttrsUpdate(newVal) {
            var newAttrs = live.getAttributeParts(newVal), name;
            for (name in newAttrs) {
                var newValue = newAttrs[name], oldValue = oldAttrs[name];
                if (newValue !== oldValue) {
                    domMutateNode.setAttribute.call(el, name, newValue);
                    var callback = viewCallbacks.attr(name);
                    if (callback) {
                        callback(el, {
                            attributeName: name,
                            scope: scope,
                            options: options
                        });
                    }
                }
                delete oldAttrs[name];
            }
            for (name in oldAttrs) {
                domMutateNode.removeAttribute.call(el, name);
            }
            oldAttrs = newAttrs;
        }
        canReflect.onValue(compute, liveAttrsUpdate, 'domUI');
        var removalDisposal;
        var teardownHandler = function () {
            canReflect.offValue(compute, liveAttrsUpdate, 'domUI');
            if (removalDisposal) {
                removalDisposal();
                removalDisposal = undefined;
            }
        };
        removalDisposal = domMutate.onNodeRemoval(el, function () {
            var doc = el.ownerDocument;
            var ownerNode = doc.contains ? doc : doc.documentElement;
            if (!ownerNode.contains(el)) {
                teardownHandler();
            }
        });
        liveAttrsUpdate(canReflect.getValue(compute));
    };
});
/*can-view-live@4.2.6#lib/html*/
define('can-view-live@4.2.6#lib/html', [
    'require',
    'exports',
    'module',
    './core',
    'can-view-nodelist',
    'can-fragment',
    'can-child-nodes',
    'can-reflect',
    'can-symbol',
    'can-queues'
], function (require, exports, module) {
    'use strict';
    var live = require('./core');
    var nodeLists = require('can-view-nodelist');
    var makeFrag = require('can-fragment');
    var childNodes = require('can-child-nodes');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var queues = require('can-queues');
    var viewInsertSymbol = canSymbol.for('can.viewInsert');
    function updateNodeList(data, frag, nodeListUpdatedByFn) {
        if (data.nodeList.isUnregistered !== true) {
            var newChildren = canReflect.toArray(childNodes(frag));
            if (!nodeListUpdatedByFn) {
                nodeLists.update(data.nodeList, newChildren, data.oldNodes);
            }
            var oldNodes = data.oldNodes;
            data.oldNodes = newChildren;
            nodeLists.replace(oldNodes, frag);
        }
    }
    live.html = function (el, compute, parentNode, nodeListOrOptions) {
        var data;
        var makeAndPut;
        var nodeList;
        var nodes;
        var options;
        if (nodeListOrOptions !== undefined) {
            if (Array.isArray(nodeListOrOptions)) {
                nodeList = nodeListOrOptions;
            } else {
                nodeList = nodeListOrOptions.nodeList;
                options = nodeListOrOptions;
            }
        }
        var meta = { reasonLog: 'live.html replace::' + canReflect.getName(compute) };
        parentNode = live.getParentNode(el, parentNode);
        function liveHTMLUpdateHTML(newVal) {
            var attached = nodeLists.first(nodes).parentNode;
            if (attached) {
                makeAndPut(newVal, true);
            }
            var pn = nodeLists.first(nodes).parentNode;
            data.teardownCheck(pn);
        }
        data = live.listen(parentNode, compute, liveHTMLUpdateHTML);
        nodes = nodeList || [el];
        makeAndPut = function (val, useQueue) {
            if (val && typeof val[viewInsertSymbol] === 'function') {
                val = val[viewInsertSymbol](options);
            }
            var isFunction = typeof val === 'function';
            var frag = makeFrag(isFunction ? '' : val);
            live.addTextNodeIfNoChildren(frag);
            if (useQueue === true) {
                data.oldNodes = nodeLists.unregisterChildren(nodes, true);
                var nodeListUpdatedByFn = false;
                if (isFunction) {
                    val(frag.firstChild);
                    nodeListUpdatedByFn = nodeLists.first(nodes) === frag.firstChild;
                }
                queues.domUIQueue.enqueue(updateNodeList, null, [
                    data,
                    frag,
                    nodeListUpdatedByFn
                ], meta);
            } else {
                data.oldNodes = nodeLists.update(nodes, childNodes(frag));
                if (isFunction) {
                    val(frag.firstChild);
                }
                nodeLists.replace(data.oldNodes, frag);
            }
        };
        data.nodeList = nodes;
        if (!nodeList) {
            nodeLists.register(nodes, data.teardownCheck);
        } else {
            nodeList.unregistered = data.teardownCheck;
        }
        makeAndPut(canReflect.getValue(compute));
    };
});
/*can-view-live@4.2.6#lib/set-observable*/
define('can-view-live@4.2.6#lib/set-observable', [
    'require',
    'exports',
    'module',
    'can-simple-observable',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var SimpleObservable = require('can-simple-observable');
    var canReflect = require('can-reflect');
    function SetObservable(initialValue, setter) {
        this.setter = setter;
        SimpleObservable.call(this, initialValue);
    }
    SetObservable.prototype = Object.create(SimpleObservable.prototype);
    SetObservable.prototype.constructor = SetObservable;
    SetObservable.prototype.set = function (newVal) {
        this.setter(newVal);
    };
    canReflect.assignSymbols(SetObservable.prototype, { 'can.setValue': SetObservable.prototype.set });
    module.exports = SetObservable;
});
/*can-diff@1.4.2#patcher/patcher*/
define('can-diff@1.4.2#patcher/patcher', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-key-tree',
    'can-symbol',
    '../list/list',
    'can-queues',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var KeyTree = require('can-key-tree');
    var canSymbol = require('can-symbol');
    var diff = require('../list/list');
    var queues = require('can-queues');
    var canSymbol = require('can-symbol');
    var onValueSymbol = canSymbol.for('can.onValue'), offValueSymbol = canSymbol.for('can.offValue');
    var onPatchesSymbol = canSymbol.for('can.onPatches');
    var offPatchesSymbol = canSymbol.for('can.offPatches');
    var Patcher = function (observableOrList, priority) {
        this.handlers = new KeyTree([
            Object,
            Array
        ], {
            onFirst: this.setup.bind(this),
            onEmpty: this.teardown.bind(this)
        });
        this.observableOrList = observableOrList;
        this.isObservableValue = canReflect.isValueLike(this.observableOrList) || canReflect.isObservableLike(this.observableOrList);
        if (this.isObservableValue) {
            this.priority = canReflect.getPriority(observableOrList);
        } else {
            this.priority = priority || 0;
        }
        this.onList = this.onList.bind(this);
        this.onPatchesNotify = this.onPatchesNotify.bind(this);
        this.onPatchesDerive = this.onPatchesDerive.bind(this);
        this.patches = [];
    };
    Patcher.prototype = {
        constructor: Patcher,
        setup: function () {
            if (this.observableOrList[onValueSymbol]) {
                canReflect.onValue(this.observableOrList, this.onList, 'notify');
                this.setupList(canReflect.getValue(this.observableOrList));
            } else {
                this.setupList(this.observableOrList);
            }
        },
        teardown: function () {
            if (this.observableOrList[offValueSymbol]) {
                canReflect.offValue(this.observableOrList, this.onList, 'notify');
            }
        },
        setupList: function (list) {
            this.currentList = list;
            if (list && list[onPatchesSymbol]) {
                list[onPatchesSymbol](this.onPatchesNotify, 'notify');
            }
        },
        onList: function onList(newList) {
            var current = this.currentList || [];
            newList = newList || [];
            if (current[offPatchesSymbol]) {
                current[offPatchesSymbol](this.onPatchesNotify, 'notify');
            }
            var patches = diff(current, newList);
            this.currentList = newList;
            this.onPatchesNotify(patches);
            if (newList[onPatchesSymbol]) {
                newList[onPatchesSymbol](this.onPatchesNotify, 'notify');
            }
        },
        onPatchesNotify: function onPatchesNotify(patches) {
            this.patches.push.apply(this.patches, patches);
            queues.deriveQueue.enqueue(this.onPatchesDerive, this, [], { priority: this.priority });
        },
        onPatchesDerive: function onPatchesDerive() {
            var patches = this.patches;
            this.patches = [];
            queues.enqueueByQueue(this.handlers.getNode([]), this.currentList, [
                patches,
                this.currentList
            ], null, [
                'Apply patches',
                patches
            ]);
        }
    };
    canReflect.assignSymbols(Patcher.prototype, {
        'can.onPatches': function (handler, queue) {
            this.handlers.add([
                queue || 'mutate',
                handler
            ]);
        },
        'can.offPatches': function (handler, queue) {
            this.handlers.delete([
                queue || 'mutate',
                handler
            ]);
        }
    });
    module.exports = Patcher;
});
/*can-view-live@4.2.6#lib/list*/
define('can-view-live@4.2.6#lib/list', [
    'require',
    'exports',
    'module',
    './core',
    'can-view-nodelist',
    'can-fragment',
    'can-child-nodes',
    'can-dom-mutate/node',
    'can-reflect',
    'can-symbol',
    'can-reflect-dependencies',
    'can-simple-observable',
    './set-observable',
    'can-diff/patcher/patcher'
], function (require, exports, module) {
    'use strict';
    var live = require('./core');
    var nodeLists = require('can-view-nodelist');
    var frag = require('can-fragment');
    var childNodes = require('can-child-nodes');
    var domMutateNode = require('can-dom-mutate/node');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var canReflectDeps = require('can-reflect-dependencies');
    var SimpleObservable = require('can-simple-observable');
    var SetObservable = require('./set-observable');
    var Patcher = require('can-diff/patcher/patcher');
    var splice = [].splice;
    var renderAndAddToNodeLists = function (newNodeLists, parentNodeList, render, context, args) {
            var itemNodeList = [];
            if (parentNodeList) {
                nodeLists.register(itemNodeList, null, true, true);
                itemNodeList.parentList = parentNodeList;
                itemNodeList.expression = '#each SUBEXPRESSION';
            }
            var itemHTML = render.apply(context, args.concat([itemNodeList])), itemFrag = frag(itemHTML);
            var children = canReflect.toArray(childNodes(itemFrag));
            if (parentNodeList) {
                nodeLists.update(itemNodeList, children);
                newNodeLists.push(itemNodeList);
            } else {
                newNodeLists.push(nodeLists.register(children));
            }
            return itemFrag;
        }, removeFromNodeList = function (masterNodeList, index, length) {
            var removedMappings = masterNodeList.splice(index + 1, length), itemsToRemove = [];
            removedMappings.forEach(function (nodeList) {
                var nodesToRemove = nodeLists.unregister(nodeList);
                [].push.apply(itemsToRemove, nodesToRemove);
            });
            return itemsToRemove;
        };
    var onPatchesSymbol = canSymbol.for('can.onPatches');
    var offPatchesSymbol = canSymbol.for('can.offPatches');
    function ListDOMPatcher(el, compute, render, context, parentNode, nodeList, falseyRender) {
        this.patcher = new Patcher(compute);
        parentNode = live.getParentNode(el, parentNode);
        this.value = compute;
        this.render = render;
        this.context = context;
        this.parentNode = parentNode;
        this.falseyRender = falseyRender;
        this.masterNodeList = nodeList || nodeLists.register([el], null, true);
        this.placeholder = el;
        this.indexMap = [];
        this.isValueLike = canReflect.isValueLike(this.value);
        this.isObservableLike = canReflect.isObservableLike(this.value);
        this.onPatches = this.onPatches.bind(this);
        var data = this.data = live.setup(parentNode, this.setupValueBinding.bind(this), this.teardownValueBinding.bind(this));
        this.masterNodeList.unregistered = function () {
            data.teardownCheck();
        };
    }
    var onPatchesSymbol = canSymbol.for('can.onPatches');
    var offPatchesSymbol = canSymbol.for('can.offPatches');
    ListDOMPatcher.prototype = {
        setupValueBinding: function () {
            this.patcher[onPatchesSymbol](this.onPatches, 'domUI');
            if (this.patcher.currentList && this.patcher.currentList.length) {
                this.onPatches([{
                        insert: this.patcher.currentList,
                        index: 0,
                        deleteCount: 0
                    }]);
            } else {
                this.addFalseyIfEmpty();
            }
        },
        teardownValueBinding: function () {
            this.patcher[offPatchesSymbol](this.onPatches, 'domUI');
            this.exit = true;
            this.remove({ length: this.patcher.currentList.length }, 0, true);
        },
        onPatches: function ListDOMPatcher_onPatches(patches) {
            if (this.exit) {
                return;
            }
            for (var i = 0, patchLen = patches.length; i < patchLen; i++) {
                var patch = patches[i];
                if (patch.type === 'move') {
                    this.move(patch.toIndex, patch.fromIndex);
                } else {
                    if (patch.deleteCount) {
                        this.remove({ length: patch.deleteCount }, patch.index, true);
                    }
                    if (patch.insert && patch.insert.length) {
                        this.add(patch.insert, patch.index);
                    }
                }
            }
        },
        add: function (items, index) {
            var frag = this.placeholder.ownerDocument.createDocumentFragment(), newNodeLists = [], newIndicies = [], masterNodeList = this.masterNodeList, render = this.render, context = this.context;
            items.forEach(function (item, key) {
                var itemIndex = new SimpleObservable(key + index), itemCompute = new SetObservable(item, function (newVal) {
                        canReflect.setKeyValue(this.patcher.currentList, itemIndex.get(), newVal);
                    }.bind(this)), itemFrag = renderAndAddToNodeLists(newNodeLists, masterNodeList, render, context, [
                        itemCompute,
                        itemIndex
                    ]);
                frag.appendChild(itemFrag);
                newIndicies.push(itemIndex);
            }, this);
            var masterListIndex = index + 1;
            if (!this.indexMap.length) {
                var falseyItemsToRemove = removeFromNodeList(masterNodeList, 0, masterNodeList.length - 1);
                nodeLists.remove(falseyItemsToRemove);
            }
            if (!masterNodeList[masterListIndex]) {
                nodeLists.after(masterListIndex === 1 ? [this.placeholder] : [nodeLists.last(this.masterNodeList[masterListIndex - 1])], frag);
            } else {
                var el = nodeLists.first(masterNodeList[masterListIndex]);
                domMutateNode.insertBefore.call(el.parentNode, frag, el);
            }
            splice.apply(this.masterNodeList, [
                masterListIndex,
                0
            ].concat(newNodeLists));
            splice.apply(this.indexMap, [
                index,
                0
            ].concat(newIndicies));
            for (var i = index + newIndicies.length, len = this.indexMap.length; i < len; i++) {
                this.indexMap[i].set(i);
            }
        },
        remove: function (items, index) {
            if (index < 0) {
                index = this.indexMap.length + index;
            }
            var itemsToRemove = removeFromNodeList(this.masterNodeList, index, items.length);
            var indexMap = this.indexMap;
            indexMap.splice(index, items.length);
            for (var i = index, len = indexMap.length; i < len; i++) {
                indexMap[i].set(i);
            }
            if (!this.exit) {
                this.addFalseyIfEmpty();
                nodeLists.remove(itemsToRemove);
            } else {
                nodeLists.unregister(this.masterNodeList);
            }
        },
        addFalseyIfEmpty: function () {
            if (this.falseyRender && this.indexMap.length === 0) {
                var falseyNodeLists = [];
                var falseyFrag = renderAndAddToNodeLists(falseyNodeLists, this.masterNodeList, this.falseyRender, this.currentList, [this.currentList]);
                nodeLists.after([this.masterNodeList[0]], falseyFrag);
                this.masterNodeList.push(falseyNodeLists[0]);
            }
        },
        move: function move(newIndex, currentIndex) {
            newIndex = newIndex + 1;
            currentIndex = currentIndex + 1;
            var masterNodeList = this.masterNodeList, indexMap = this.indexMap;
            var referenceNodeList = masterNodeList[newIndex];
            var movedElements = frag(nodeLists.flatten(masterNodeList[currentIndex]));
            var referenceElement;
            if (currentIndex < newIndex) {
                referenceElement = nodeLists.last(referenceNodeList).nextSibling;
            } else {
                referenceElement = nodeLists.first(referenceNodeList);
            }
            var parentNode = masterNodeList[0].parentNode;
            parentNode.insertBefore(movedElements, referenceElement);
            var temp = masterNodeList[currentIndex];
            [].splice.apply(masterNodeList, [
                currentIndex,
                1
            ]);
            [].splice.apply(masterNodeList, [
                newIndex,
                0,
                temp
            ]);
            newIndex = newIndex - 1;
            currentIndex = currentIndex - 1;
            var indexCompute = indexMap[currentIndex];
            [].splice.apply(indexMap, [
                currentIndex,
                1
            ]);
            [].splice.apply(indexMap, [
                newIndex,
                0,
                indexCompute
            ]);
            var i = Math.min(currentIndex, newIndex);
            var len = indexMap.length;
            for (i, len; i < len; i++) {
                indexMap[i].set(i);
            }
        },
        set: function (newVal, index) {
            this.remove({ length: 1 }, index, true);
            this.add([newVal], index);
        }
    };
    live.list = function (el, list, render, context, parentNode, nodeList, falseyRender) {
        if (el.nodeType !== Node.TEXT_NODE) {
            var textNode;
            if (!nodeList) {
                textNode = document.createTextNode('');
                el.parentNode.replaceChild(textNode, el);
                el = textNode;
            } else {
                textNode = document.createTextNode('');
                nodeLists.replace(nodeList, textNode);
                nodeLists.update(nodeList, [textNode]);
                el = textNode;
            }
        }
        new ListDOMPatcher(el, list, render, context, parentNode, nodeList, falseyRender);
    };
});
/*can-view-live@4.2.6#lib/text*/
define('can-view-live@4.2.6#lib/text', [
    'require',
    'exports',
    'module',
    './core',
    'can-view-nodelist',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var live = require('./core');
    var nodeLists = require('can-view-nodelist');
    var canReflect = require('can-reflect');
    live.text = function (el, compute, parentNode, nodeList) {
        if (el.nodeType !== Node.TEXT_NODE) {
            var textNode;
            if (!nodeList) {
                textNode = document.createTextNode('');
                el.parentNode.replaceChild(textNode, el);
                el = textNode;
            } else {
                textNode = document.createTextNode('');
                nodeLists.replace(nodeList, textNode);
                nodeLists.update(nodeList, [textNode]);
                el = textNode;
            }
        }
        var parent = live.getParentNode(el, parentNode);
        el.nodeValue = live.makeString(canReflect.getValue(compute));
        function liveTextUpdateTextNode(newVal) {
            el.nodeValue = live.makeString(newVal);
        }
        var data = live.listen(parent, compute, liveTextUpdateTextNode, 'domUI');
        if (!nodeList) {
            nodeList = nodeLists.register([el], null, true);
        }
        nodeList.unregistered = data.teardownCheck;
        data.nodeList = nodeList;
    };
});
/*can-view-live@4.2.6#can-view-live*/
define('can-view-live@4.2.6#can-view-live', [
    'require',
    'exports',
    'module',
    './lib/core',
    './lib/attr',
    './lib/attrs',
    './lib/html',
    './lib/list',
    './lib/text'
], function (require, exports, module) {
    'use strict';
    var live = require('./lib/core');
    require('./lib/attr');
    require('./lib/attrs');
    require('./lib/html');
    require('./lib/list');
    require('./lib/text');
    module.exports = live;
});
/*can-stache@4.15.1#src/text_section*/
define('can-stache@4.15.1#src/text_section', [
    'require',
    'exports',
    'module',
    'can-view-live',
    './utils',
    'can-dom-mutate/node',
    'can-assign',
    'can-reflect',
    'can-observation'
], function (require, exports, module) {
    'use strict';
    var live = require('can-view-live');
    var utils = require('./utils');
    var domMutate = require('can-dom-mutate/node');
    var assign = require('can-assign');
    var canReflect = require('can-reflect');
    var Observation = require('can-observation');
    var noop = function () {
    };
    var TextSectionBuilder = function () {
        this.stack = [new TextSection()];
    };
    assign(TextSectionBuilder.prototype, utils.mixins);
    assign(TextSectionBuilder.prototype, {
        startSection: function (process) {
            var subSection = new TextSection();
            this.last().add({
                process: process,
                truthy: subSection
            });
            this.stack.push(subSection);
        },
        endSection: function () {
            this.stack.pop();
        },
        inverse: function () {
            this.stack.pop();
            var falseySection = new TextSection();
            this.last().last().falsey = falseySection;
            this.stack.push(falseySection);
        },
        compile: function (state) {
            var renderer = this.stack[0].compile();
            return function (scope) {
                function textSectionRender() {
                    return renderer(scope);
                }
                var observation = new Observation(textSectionRender, null, { isObservable: false });
                canReflect.onValue(observation, noop);
                var value = canReflect.getValue(observation);
                if (canReflect.valueHasDependencies(observation)) {
                    if (state.textContentOnly) {
                        live.text(this, observation);
                    } else if (state.attr) {
                        live.attr(this, state.attr, observation);
                    } else {
                        live.attrs(this, observation, scope);
                    }
                    canReflect.offValue(observation, noop);
                } else {
                    if (state.textContentOnly) {
                        this.nodeValue = value;
                    } else if (state.attr) {
                        domMutate.setAttribute.call(this, state.attr, value);
                    } else {
                        live.attrs(this, value);
                    }
                }
            };
        }
    });
    var passTruthyFalsey = function (process, truthy, falsey) {
        return function (scope) {
            return process.call(this, scope, truthy, falsey);
        };
    };
    var TextSection = function () {
        this.values = [];
    };
    assign(TextSection.prototype, {
        add: function (data) {
            this.values.push(data);
        },
        last: function () {
            return this.values[this.values.length - 1];
        },
        compile: function () {
            var values = this.values, len = values.length;
            for (var i = 0; i < len; i++) {
                var value = this.values[i];
                if (typeof value === 'object') {
                    values[i] = passTruthyFalsey(value.process, value.truthy && value.truthy.compile(), value.falsey && value.falsey.compile());
                }
            }
            return function (scope) {
                var txt = '', value;
                for (var i = 0; i < len; i++) {
                    value = values[i];
                    txt += typeof value === 'string' ? value : value.call(this, scope);
                }
                return txt;
            };
        }
    });
    module.exports = TextSectionBuilder;
});
/*can-stache@4.15.1#expressions/arg*/
define('can-stache@4.15.1#expressions/arg', function (require, exports, module) {
    'use strict';
    var Arg = function (expression, modifiers) {
        this.expr = expression;
        this.modifiers = modifiers || {};
        this.isCompute = false;
    };
    Arg.prototype.value = function () {
        return this.expr.value.apply(this.expr, arguments);
    };
    module.exports = Arg;
});
/*can-stache@4.15.1#expressions/literal*/
define('can-stache@4.15.1#expressions/literal', function (require, exports, module) {
    'use strict';
    var Literal = function (value) {
        this._value = value;
    };
    Literal.prototype.value = function () {
        return this._value;
    };
    module.exports = Literal;
});
/*can-simple-observable@2.4.0#setter/setter*/
define('can-simple-observable@2.4.0#setter/setter', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-observation',
    '../settable/settable',
    'can-event-queue/value/value'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var Observation = require('can-observation');
    var SettableObservable = require('../settable/settable');
    var valueEventBindings = require('can-event-queue/value/value');
    function SetterObservable(getter, setter) {
        this.setter = setter;
        this.observation = new Observation(getter);
        this.handler = this.handler.bind(this);
    }
    SetterObservable.prototype = Object.create(SettableObservable.prototype);
    SetterObservable.prototype.constructor = SetterObservable;
    SetterObservable.prototype.set = function (newVal) {
        this.setter(newVal);
    };
    SetterObservable.prototype.hasDependencies = function () {
        return canReflect.valueHasDependencies(this.observation);
    };
    canReflect.assignSymbols(SetterObservable.prototype, {
        'can.setValue': SetterObservable.prototype.set,
        'can.valueHasDependencies': SetterObservable.prototype.hasDependencies
    });
    module.exports = SetterObservable;
});
/*can-stache@4.15.1#src/expression-helpers*/
define('can-stache@4.15.1#src/expression-helpers', [
    'require',
    'exports',
    'module',
    '../expressions/arg',
    '../expressions/literal',
    'can-reflect',
    'can-stache-key',
    'can-symbol',
    'can-observation',
    'can-view-scope/make-compute-like',
    'can-simple-observable/setter/setter'
], function (require, exports, module) {
    'use strict';
    var Arg = require('../expressions/arg');
    var Literal = require('../expressions/literal');
    var canReflect = require('can-reflect');
    var stacheKey = require('can-stache-key');
    var canSymbol = require('can-symbol');
    var Observation = require('can-observation');
    var makeComputeLike = require('can-view-scope/make-compute-like');
    var SetterObservable = require('can-simple-observable/setter/setter');
    function getObservableValue_fromKey(key, scope, readOptions) {
        var data = scope.computeData(key, readOptions);
        Observation.temporarilyBind(data);
        return data;
    }
    function computeHasDependencies(compute) {
        return compute[canSymbol.for('can.valueHasDependencies')] ? canReflect.valueHasDependencies(compute) : compute.computeInstance.hasDependencies;
    }
    function getObservableValue_fromDynamicKey_fromObservable(key, root, helperOptions, readOptions) {
        var getKeys = function () {
            return stacheKey.reads(('' + canReflect.getValue(key)).replace(/\./g, '\\.'));
        };
        var parentHasKey;
        var computeValue = new SetterObservable(function getDynamicKey() {
            var readData = stacheKey.read(canReflect.getValue(root), getKeys());
            parentHasKey = readData.parentHasKey;
            return readData.value;
        }, function setDynamicKey(newVal) {
            stacheKey.write(canReflect.getValue(root), getKeys(), newVal);
        });
        Observation.temporarilyBind(computeValue);
        computeValue.initialValue = canReflect.getValue(computeValue);
        computeValue.parentHasKey = parentHasKey;
        return computeValue;
    }
    function convertToArgExpression(expr) {
        if (!(expr instanceof Arg) && !(expr instanceof Literal)) {
            return new Arg(expr);
        } else {
            return expr;
        }
    }
    function toComputeOrValue(value) {
        if (canReflect.isObservableLike(value)) {
            if (canReflect.isValueLike(value) && canReflect.valueHasDependencies(value) === false) {
                return canReflect.getValue(value);
            }
            if (value.compute) {
                return value.compute;
            } else {
                return makeComputeLike(value);
            }
        }
        return value;
    }
    function toCompute(value) {
        if (value) {
            if (value.isComputed) {
                return value;
            }
            if (value.compute) {
                return value.compute;
            } else {
                return makeComputeLike(value);
            }
        }
        return value;
    }
    module.exports = {
        getObservableValue_fromKey: getObservableValue_fromKey,
        computeHasDependencies: computeHasDependencies,
        getObservableValue_fromDynamicKey_fromObservable: getObservableValue_fromDynamicKey_fromObservable,
        convertToArgExpression: convertToArgExpression,
        toComputeOrValue: toComputeOrValue,
        toCompute: toCompute
    };
});
/*can-stache@4.15.1#expressions/hashes*/
define('can-stache@4.15.1#expressions/hashes', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-observation',
    '../src/expression-helpers'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var Observation = require('can-observation');
    var expressionHelpers = require('../src/expression-helpers');
    var Hashes = function (hashes) {
        this.hashExprs = hashes;
    };
    Hashes.prototype.value = function (scope, helperOptions) {
        var hash = {};
        for (var prop in this.hashExprs) {
            var val = expressionHelpers.convertToArgExpression(this.hashExprs[prop]), value = val.value.apply(val, arguments);
            hash[prop] = {
                call: !val.modifiers || !val.modifiers.compute,
                value: value
            };
        }
        return new Observation(function () {
            var finalHash = {};
            for (var prop in hash) {
                finalHash[prop] = hash[prop].call ? canReflect.getValue(hash[prop].value) : expressionHelpers.toComputeOrValue(hash[prop].value);
            }
            return finalHash;
        });
    };
    module.exports = Hashes;
});
/*can-stache@4.15.1#expressions/bracket*/
define('can-stache@4.15.1#expressions/bracket', [
    'require',
    'exports',
    'module',
    '../src/expression-helpers'
], function (require, exports, module) {
    'use strict';
    var expressionHelpers = require('../src/expression-helpers');
    var Bracket = function (key, root, originalKey) {
        this.root = root;
        this.key = key;
    };
    Bracket.prototype.value = function (scope, helpers) {
        var root = this.root ? this.root.value(scope, helpers) : scope.peek('this');
        return expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key.value(scope, helpers), root, scope, helpers, {});
    };
    Bracket.prototype.closingTag = function () {
    };
    module.exports = Bracket;
});
/*can-stache@4.15.1#src/set-identifier*/
define('can-stache@4.15.1#src/set-identifier', function (require, exports, module) {
    'use strict';
    module.exports = function SetIdentifier(value) {
        this.value = value;
    };
});
/*can-stache@4.15.1#expressions/call*/
define('can-stache@4.15.1#expressions/call', [
    'require',
    'exports',
    'module',
    './hashes',
    '../src/set-identifier',
    'can-symbol',
    'can-simple-observable/setter/setter',
    '../src/expression-helpers',
    'can-reflect',
    'can-assign'
], function (require, exports, module) {
    'use strict';
    var Hashes = require('./hashes');
    var SetIdentifier = require('../src/set-identifier');
    var canSymbol = require('can-symbol');
    var SetterObservable = require('can-simple-observable/setter/setter');
    var expressionHelpers = require('../src/expression-helpers');
    var canReflect = require('can-reflect');
    var assign = require('can-assign');
    var sourceTextSymbol = canSymbol.for('can-stache.sourceText');
    var isViewSymbol = canSymbol.for('can.isView');
    var Call = function (methodExpression, argExpressions) {
        this.methodExpr = methodExpression;
        this.argExprs = argExpressions.map(expressionHelpers.convertToArgExpression);
    };
    Call.prototype.args = function (scope, ignoreArgLookup) {
        var hashExprs = {};
        var args = [];
        var gotIgnoreFunction = typeof ignoreArgLookup === 'function';
        for (var i = 0, len = this.argExprs.length; i < len; i++) {
            var arg = this.argExprs[i];
            if (arg.expr instanceof Hashes) {
                assign(hashExprs, arg.expr.hashExprs);
            }
            if (!gotIgnoreFunction || !ignoreArgLookup(i)) {
                var value = arg.value.apply(arg, arguments);
                args.push({
                    call: !arg.modifiers || !arg.modifiers.compute,
                    value: value
                });
            }
        }
        return function (doNotWrapArguments) {
            var finalArgs = [];
            if (canReflect.size(hashExprs) > 0) {
                finalArgs.hashExprs = hashExprs;
            }
            for (var i = 0, len = args.length; i < len; i++) {
                if (doNotWrapArguments) {
                    finalArgs[i] = args[i].value;
                } else {
                    finalArgs[i] = args[i].call ? canReflect.getValue(args[i].value) : expressionHelpers.toCompute(args[i].value);
                }
            }
            return finalArgs;
        };
    };
    Call.prototype.value = function (scope, helperOptions) {
        var callExpression = this;
        var method = this.methodExpr.value(scope, { proxyMethods: false }), func = canReflect.getValue(method);
        var getArgs = callExpression.args(scope, func && func.ignoreArgLookup);
        var computeFn = function (newVal) {
            var func = canReflect.getValue(method);
            if (typeof func === 'function') {
                var args = getArgs(func.isLiveBound);
                if (func.requiresOptionsArgument) {
                    if (args.hashExprs && helperOptions && helperOptions.exprData) {
                        helperOptions.exprData.hashExprs = args.hashExprs;
                    }
                    if (helperOptions !== undefined) {
                        args.push(helperOptions);
                    }
                }
                if (func[isViewSymbol] === true) {
                    args.push(helperOptions.nodeList);
                }
                if (arguments.length) {
                    args.unshift(new SetIdentifier(newVal));
                }
                return func.apply(method.thisArg || scope.peek('this'), args);
            }
        };
        if (helperOptions && helperOptions.doNotWrapInObservation) {
            return computeFn();
        } else {
            var computeValue = new SetterObservable(computeFn, computeFn);
            return computeValue;
        }
    };
    Call.prototype.closingTag = function () {
        return this.methodExpr.key;
    };
    module.exports = Call;
});
/*can-stache@4.15.1#expressions/helper*/
define('can-stache@4.15.1#expressions/helper', [
    'require',
    'exports',
    'module',
    './literal',
    './hashes',
    'can-assign',
    'can-log/dev/dev',
    '../src/expression-helpers',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var Literal = require('./literal');
    var Hashes = require('./hashes');
    var assign = require('can-assign');
    var dev = require('can-log/dev/dev');
    var expressionHelpers = require('../src/expression-helpers');
    var canReflect = require('can-reflect');
    var Helper = function (methodExpression, argExpressions, hashExpressions) {
        this.methodExpr = methodExpression;
        this.argExprs = argExpressions;
        this.hashExprs = hashExpressions;
        this.mode = null;
    };
    Helper.prototype.args = function (scope) {
        var args = [];
        for (var i = 0, len = this.argExprs.length; i < len; i++) {
            var arg = this.argExprs[i];
            args.push(expressionHelpers.toComputeOrValue(arg.value.apply(arg, arguments)));
        }
        return args;
    };
    Helper.prototype.hash = function (scope) {
        var hash = {};
        for (var prop in this.hashExprs) {
            var val = this.hashExprs[prop];
            hash[prop] = expressionHelpers.toComputeOrValue(val.value.apply(val, arguments));
        }
        return hash;
    };
    Helper.prototype.value = function (scope, helperOptions) {
        var methodKey = this.methodExpr instanceof Literal ? '' + this.methodExpr._value : this.methodExpr.key, helperInstance = this, helperFn = expressionHelpers.getObservableValue_fromKey(methodKey, scope, { proxyMethods: false }), initialValue = helperFn && helperFn.initialValue, thisArg = helperFn && helperFn.thisArg;
        if (typeof initialValue === 'function') {
            helperFn = function helperFn() {
                var args = helperInstance.args(scope), helperOptionArg = assign(assign({}, helperOptions), {
                        hash: helperInstance.hash(scope),
                        exprData: helperInstance
                    });
                args.push(helperOptionArg);
                return initialValue.apply(thisArg || scope.peek('this'), args);
            };
        }
        return helperFn;
    };
    Helper.prototype.closingTag = function () {
        return this.methodExpr.key;
    };
    if (process.env.NODE_ENV !== 'production') {
        canReflect.assignSymbols(Helper.prototype, {
            'can.getName': function () {
                return canReflect.getName(this.constructor) + '{{' + this.sourceText() + '}}';
            }
        });
    }
    module.exports = Helper;
});
/*can-stache@4.15.1#expressions/lookup*/
define('can-stache@4.15.1#expressions/lookup', [
    'require',
    'exports',
    'module',
    '../src/expression-helpers',
    'can-reflect',
    'can-symbol',
    'can-log/dev/dev',
    'can-stache-key'
], function (require, exports, module) {
    'use strict';
    var expressionHelpers = require('../src/expression-helpers');
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var sourceTextSymbol = canSymbol.for('can-stache.sourceText');
    var dev = require('can-log/dev/dev');
    var observeReader = require('can-stache-key');
    var Lookup = function (key, root, sourceText) {
        this.key = key;
        this.rootExpr = root;
        canReflect.setKeyValue(this, sourceTextSymbol, sourceText);
    };
    Lookup.prototype.value = function (scope, readOptions) {
        var value;
        if (this.rootExpr) {
            value = expressionHelpers.getObservableValue_fromDynamicKey_fromObservable(this.key, this.rootExpr.value(scope), scope, {}, {});
        } else {
            value = expressionHelpers.getObservableValue_fromKey(this.key, scope, readOptions);
        }
        return value;
    };
    module.exports = Lookup;
});
/*can-stache@4.15.1#src/expression*/
define('can-stache@4.15.1#src/expression', [
    'require',
    'exports',
    'module',
    '../expressions/arg',
    '../expressions/literal',
    '../expressions/hashes',
    '../expressions/bracket',
    '../expressions/call',
    '../expressions/helper',
    '../expressions/lookup',
    './set-identifier',
    '../src/expression-helpers',
    './utils',
    'can-assign',
    'can-reflect',
    'can-symbol'
], function (require, exports, module) {
    'use strict';
    var Arg = require('../expressions/arg');
    var Literal = require('../expressions/literal');
    var Hashes = require('../expressions/hashes');
    var Bracket = require('../expressions/bracket');
    var Call = require('../expressions/call');
    var Helper = require('../expressions/helper');
    var Lookup = require('../expressions/lookup');
    var SetIdentifier = require('./set-identifier');
    var expressionHelpers = require('../src/expression-helpers');
    var utils = require('./utils');
    var assign = require('can-assign');
    var last = utils.last;
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var sourceTextSymbol = canSymbol.for('can-stache.sourceText');
    var Hash = function () {
    };
    var keyRegExp = /[\w\.\\\-_@\/\&%]+/, tokensRegExp = /('.*?'|".*?"|=|[\w\.\\\-_@\/*%\$]+|[\(\)]|,|\~|\[|\]\s*|\s*(?=\[))/g, bracketSpaceRegExp = /\]\s+/, literalRegExp = /^('.*?'|".*?"|-?[0-9]+\.?[0-9]*|true|false|null|undefined)$/;
    var isTokenKey = function (token) {
        return keyRegExp.test(token);
    };
    var testDot = /^[\.@]\w/;
    var isAddingToExpression = function (token) {
        return isTokenKey(token) && testDot.test(token);
    };
    var ensureChildren = function (type) {
        if (!type.children) {
            type.children = [];
        }
        return type;
    };
    var Stack = function () {
        this.root = {
            children: [],
            type: 'Root'
        };
        this.current = this.root;
        this.stack = [this.root];
    };
    assign(Stack.prototype, {
        top: function () {
            return last(this.stack);
        },
        isRootTop: function () {
            return this.top() === this.root;
        },
        popTo: function (types) {
            this.popUntil(types);
            this.pop();
        },
        pop: function () {
            if (!this.isRootTop()) {
                this.stack.pop();
            }
        },
        first: function (types) {
            var curIndex = this.stack.length - 1;
            while (curIndex > 0 && types.indexOf(this.stack[curIndex].type) === -1) {
                curIndex--;
            }
            return this.stack[curIndex];
        },
        firstParent: function (types) {
            var curIndex = this.stack.length - 2;
            while (curIndex > 0 && types.indexOf(this.stack[curIndex].type) === -1) {
                curIndex--;
            }
            return this.stack[curIndex];
        },
        popUntil: function (types) {
            while (types.indexOf(this.top().type) === -1 && !this.isRootTop()) {
                this.stack.pop();
            }
            return this.top();
        },
        addTo: function (types, type) {
            var cur = this.popUntil(types);
            ensureChildren(cur).children.push(type);
        },
        addToAndPush: function (types, type) {
            this.addTo(types, type);
            this.stack.push(type);
        },
        push: function (type) {
            this.stack.push(type);
        },
        topLastChild: function () {
            return last(this.top().children);
        },
        replaceTopLastChild: function (type) {
            var children = ensureChildren(this.top()).children;
            children.pop();
            children.push(type);
            return type;
        },
        replaceTopLastChildAndPush: function (type) {
            this.replaceTopLastChild(type);
            this.stack.push(type);
        },
        replaceTopAndPush: function (type) {
            var children;
            if (this.top() === this.root) {
                children = ensureChildren(this.top()).children;
            } else {
                this.stack.pop();
                children = ensureChildren(this.top()).children;
            }
            children.pop();
            children.push(type);
            this.stack.push(type);
            return type;
        }
    });
    var convertKeyToLookup = function (key) {
        var lastPath = key.lastIndexOf('./');
        var lastDot = key.lastIndexOf('.');
        if (lastDot > lastPath) {
            return key.substr(0, lastDot) + '@' + key.substr(lastDot + 1);
        }
        var firstNonPathCharIndex = lastPath === -1 ? 0 : lastPath + 2;
        var firstNonPathChar = key.charAt(firstNonPathCharIndex);
        if (firstNonPathChar === '.' || firstNonPathChar === '@') {
            return key.substr(0, firstNonPathCharIndex) + '@' + key.substr(firstNonPathCharIndex + 1);
        } else {
            return key.substr(0, firstNonPathCharIndex) + '@' + key.substr(firstNonPathCharIndex);
        }
    };
    var convertToAtLookup = function (ast) {
        if (ast.type === 'Lookup') {
            canReflect.setKeyValue(ast, sourceTextSymbol, ast.key);
            ast.key = convertKeyToLookup(ast.key);
        }
        return ast;
    };
    var convertToHelperIfTopIsLookup = function (stack) {
        var top = stack.top();
        if (top && top.type === 'Lookup') {
            var base = stack.stack[stack.stack.length - 2];
            if (base.type !== 'Helper' && base) {
                stack.replaceTopAndPush({
                    type: 'Helper',
                    method: top
                });
            }
        }
    };
    var expression = {
        toComputeOrValue: expressionHelpers.toComputeOrValue,
        convertKeyToLookup: convertKeyToLookup,
        Literal: Literal,
        Lookup: Lookup,
        Arg: Arg,
        Hash: Hash,
        Hashes: Hashes,
        Call: Call,
        Helper: Helper,
        Bracket: Bracket,
        SetIdentifier: SetIdentifier,
        tokenize: function (expression) {
            var tokens = [];
            (expression.trim() + ' ').replace(tokensRegExp, function (whole, arg) {
                if (bracketSpaceRegExp.test(arg)) {
                    tokens.push(arg[0]);
                    tokens.push(arg.slice(1));
                } else {
                    tokens.push(arg);
                }
            });
            return tokens;
        },
        lookupRules: {
            'default': function (ast, methodType, isArg) {
                return ast.type === 'Helper' ? Helper : Lookup;
            },
            'method': function (ast, methodType, isArg) {
                return Lookup;
            }
        },
        methodRules: {
            'default': function (ast) {
                return ast.type === 'Call' ? Call : Helper;
            },
            'call': function (ast) {
                return Call;
            }
        },
        parse: function (expressionString, options) {
            options = options || {};
            var ast = this.ast(expressionString);
            if (!options.lookupRule) {
                options.lookupRule = 'default';
            }
            if (typeof options.lookupRule === 'string') {
                options.lookupRule = expression.lookupRules[options.lookupRule];
            }
            if (!options.methodRule) {
                options.methodRule = 'default';
            }
            if (typeof options.methodRule === 'string') {
                options.methodRule = expression.methodRules[options.methodRule];
            }
            var expr = this.hydrateAst(ast, options, options.baseMethodType || 'Helper');
            return expr;
        },
        hydrateAst: function (ast, options, methodType, isArg) {
            var hashes;
            if (ast.type === 'Lookup') {
                var LookupRule = options.lookupRule(ast, methodType, isArg);
                var lookup = new LookupRule(ast.key, ast.root && this.hydrateAst(ast.root, options, methodType), ast[sourceTextSymbol]);
                return lookup;
            } else if (ast.type === 'Literal') {
                return new Literal(ast.value);
            } else if (ast.type === 'Arg') {
                return new Arg(this.hydrateAst(ast.children[0], options, methodType, isArg), { compute: true });
            } else if (ast.type === 'Hash') {
                throw new Error('');
            } else if (ast.type === 'Hashes') {
                hashes = {};
                ast.children.forEach(function (hash) {
                    hashes[hash.prop] = this.hydrateAst(hash.children[0], options, methodType, true);
                }, this);
                return new Hashes(hashes);
            } else if (ast.type === 'Call' || ast.type === 'Helper') {
                hashes = {};
                var args = [], children = ast.children, ExpressionType = options.methodRule(ast);
                if (children) {
                    for (var i = 0; i < children.length; i++) {
                        var child = children[i];
                        if (child.type === 'Hashes' && ast.type === 'Helper' && ExpressionType !== Call) {
                            child.children.forEach(function (hash) {
                                hashes[hash.prop] = this.hydrateAst(hash.children[0], options, ast.type, true);
                            }, this);
                        } else {
                            args.push(this.hydrateAst(child, options, ast.type, true));
                        }
                    }
                }
                return new ExpressionType(this.hydrateAst(ast.method, options, ast.type), args, hashes);
            } else if (ast.type === 'Bracket') {
                var originalKey;
                return new Bracket(this.hydrateAst(ast.children[0], options), ast.root ? this.hydrateAst(ast.root, options) : undefined, originalKey);
            }
        },
        ast: function (expression) {
            var tokens = this.tokenize(expression);
            return this.parseAst(tokens, { index: 0 });
        },
        parseAst: function (tokens, cursor) {
            var stack = new Stack(), top, firstParent, lastToken;
            while (cursor.index < tokens.length) {
                var token = tokens[cursor.index], nextToken = tokens[cursor.index + 1];
                cursor.index++;
                if (nextToken === '=') {
                    top = stack.top();
                    if (top && top.type === 'Lookup') {
                        firstParent = stack.firstParent([
                            'Call',
                            'Helper',
                            'Hash'
                        ]);
                        if (firstParent.type === 'Call' || firstParent.type === 'Root') {
                            stack.popUntil(['Call']);
                            top = stack.top();
                            stack.replaceTopAndPush({
                                type: 'Helper',
                                method: top.type === 'Root' ? last(top.children) : top
                            });
                        }
                    }
                    firstParent = stack.first([
                        'Call',
                        'Helper',
                        'Hashes',
                        'Root'
                    ]);
                    var hash = {
                        type: 'Hash',
                        prop: token
                    };
                    if (firstParent.type === 'Hashes') {
                        stack.addToAndPush(['Hashes'], hash);
                    } else {
                        stack.addToAndPush([
                            'Helper',
                            'Call',
                            'Root'
                        ], {
                            type: 'Hashes',
                            children: [hash]
                        });
                        stack.push(hash);
                    }
                    cursor.index++;
                } else if (literalRegExp.test(token)) {
                    convertToHelperIfTopIsLookup(stack);
                    firstParent = stack.first([
                        'Helper',
                        'Call',
                        'Hash',
                        'Bracket'
                    ]);
                    if (firstParent.type === 'Hash' && (firstParent.children && firstParent.children.length > 0)) {
                        stack.addTo([
                            'Helper',
                            'Call',
                            'Bracket'
                        ], {
                            type: 'Literal',
                            value: utils.jsonParse(token)
                        });
                    } else if (firstParent.type === 'Bracket' && (firstParent.children && firstParent.children.length > 0)) {
                        stack.addTo([
                            'Helper',
                            'Call',
                            'Hash'
                        ], {
                            type: 'Literal',
                            value: utils.jsonParse(token)
                        });
                    } else {
                        stack.addTo([
                            'Helper',
                            'Call',
                            'Hash',
                            'Bracket'
                        ], {
                            type: 'Literal',
                            value: utils.jsonParse(token)
                        });
                    }
                } else if (keyRegExp.test(token)) {
                    lastToken = stack.topLastChild();
                    firstParent = stack.first([
                        'Helper',
                        'Call',
                        'Hash',
                        'Bracket'
                    ]);
                    if (lastToken && (lastToken.type === 'Call' || lastToken.type === 'Bracket') && isAddingToExpression(token)) {
                        stack.replaceTopLastChildAndPush({
                            type: 'Lookup',
                            root: lastToken,
                            key: token.slice(1)
                        });
                    } else if (firstParent.type === 'Bracket') {
                        if (!(firstParent.children && firstParent.children.length > 0)) {
                            stack.addToAndPush(['Bracket'], {
                                type: 'Lookup',
                                key: token
                            });
                        } else {
                            if (stack.first([
                                    'Helper',
                                    'Call',
                                    'Hash',
                                    'Arg'
                                ]).type === 'Helper' && token[0] !== '.') {
                                stack.addToAndPush(['Helper'], {
                                    type: 'Lookup',
                                    key: token
                                });
                            } else {
                                stack.replaceTopAndPush({
                                    type: 'Lookup',
                                    key: token.slice(1),
                                    root: firstParent
                                });
                            }
                        }
                    } else {
                        convertToHelperIfTopIsLookup(stack);
                        stack.addToAndPush([
                            'Helper',
                            'Call',
                            'Hash',
                            'Arg',
                            'Bracket'
                        ], {
                            type: 'Lookup',
                            key: token
                        });
                    }
                } else if (token === '~') {
                    convertToHelperIfTopIsLookup(stack);
                    stack.addToAndPush([
                        'Helper',
                        'Call',
                        'Hash'
                    ], {
                        type: 'Arg',
                        key: token
                    });
                } else if (token === '(') {
                    top = stack.top();
                    if (top.type === 'Lookup') {
                        stack.replaceTopAndPush({
                            type: 'Call',
                            method: convertToAtLookup(top)
                        });
                    } else {
                        throw new Error('Unable to understand expression ' + tokens.join(''));
                    }
                } else if (token === ')') {
                    stack.popTo(['Call']);
                } else if (token === ',') {
                    var call = stack.first(['Call']);
                    if (call.type !== 'Call') {
                        stack.popUntil(['Hash']);
                    } else {
                        stack.popUntil(['Call']);
                    }
                } else if (token === '[') {
                    top = stack.top();
                    lastToken = stack.topLastChild();
                    if (lastToken && (lastToken.type === 'Call' || lastToken.type === 'Bracket')) {
                        stack.replaceTopAndPush({
                            type: 'Bracket',
                            root: lastToken
                        });
                    } else if (top.type === 'Lookup' || top.type === 'Bracket') {
                        var bracket = {
                            type: 'Bracket',
                            root: top
                        };
                        stack.replaceTopAndPush(bracket);
                    } else if (top.type === 'Call') {
                        stack.addToAndPush(['Call'], { type: 'Bracket' });
                    } else if (top === ' ') {
                        stack.popUntil([
                            'Lookup',
                            'Call'
                        ]);
                        convertToHelperIfTopIsLookup(stack);
                        stack.addToAndPush([
                            'Helper',
                            'Call',
                            'Hash'
                        ], { type: 'Bracket' });
                    } else {
                        stack.replaceTopAndPush({ type: 'Bracket' });
                    }
                } else if (token === ']') {
                    stack.pop();
                } else if (token === ' ') {
                    stack.push(token);
                }
            }
            return stack.root.children[0];
        }
    };
    module.exports = expression;
});
/*can-stache@4.15.1#src/mustache_core*/
define('can-stache@4.15.1#src/mustache_core', [
    'require',
    'exports',
    'module',
    'can-view-live',
    'can-view-nodelist',
    'can-observation',
    'can-observation-recorder',
    './utils',
    './expression',
    'can-fragment',
    'can-dom-mutate',
    'can-symbol',
    'can-reflect',
    'can-log/dev/dev',
    'can-globals/document/document',
    'can-define-lazy-value'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var live = require('can-view-live');
        var nodeLists = require('can-view-nodelist');
        var Observation = require('can-observation');
        var ObservationRecorder = require('can-observation-recorder');
        var utils = require('./utils');
        var expression = require('./expression');
        var frag = require('can-fragment');
        var domMutate = require('can-dom-mutate');
        var canSymbol = require('can-symbol');
        var canReflect = require('can-reflect');
        var dev = require('can-log/dev/dev');
        var getDocument = require('can-globals/document/document');
        var defineLazyValue = require('can-define-lazy-value');
        var toDOMSymbol = canSymbol.for('can.toDOM');
        function HelperOptions(scope, nodeList, exprData, stringOnly) {
            this.metadata = { rendered: false };
            this.stringOnly = stringOnly;
            this.scope = scope;
            this.nodeList = nodeList;
            this.exprData = exprData;
        }
        defineLazyValue(HelperOptions.prototype, 'context', function () {
            return this.scope.peek('this');
        });
        var mustacheLineBreakRegExp = /(?:(^|\r?\n)(\s*)(\{\{([\s\S]*)\}\}\}?)([^\S\n\r]*)($|\r?\n))|(\{\{([\s\S]*)\}\}\}?)/g, mustacheWhitespaceRegExp = /(\s*)(\{\{\{?)(-?)([\s\S]*?)(-?)(\}\}\}?)(\s*)/g, k = function () {
            };
        var viewInsertSymbol = canSymbol.for('can.viewInsert');
        function valueShouldBeInsertedAsHTML(value) {
            return value !== null && typeof value === 'object' && (typeof value[toDOMSymbol] === 'function' || typeof value[viewInsertSymbol] === 'function' || typeof value.nodeType === 'number');
        }
        var core = {
            expression: expression,
            makeEvaluator: function (scope, nodeList, mode, exprData, truthyRenderer, falseyRenderer, stringOnly) {
                if (mode === '^') {
                    var temp = truthyRenderer;
                    truthyRenderer = falseyRenderer;
                    falseyRenderer = temp;
                }
                var value, helperOptions = new HelperOptions(scope, nodeList, exprData, stringOnly);
                utils.createRenderers(helperOptions, scope, nodeList, truthyRenderer, falseyRenderer, stringOnly);
                if (exprData instanceof expression.Call) {
                    value = exprData.value(scope, helperOptions);
                } else if (exprData instanceof expression.Bracket) {
                    value = exprData.value(scope);
                } else if (exprData instanceof expression.Lookup) {
                    value = exprData.value(scope);
                } else if (exprData instanceof expression.Helper && exprData.methodExpr instanceof expression.Bracket) {
                    value = exprData.methodExpr.value(scope, helperOptions);
                } else {
                    value = exprData.value(scope, helperOptions);
                    if (typeof value === 'function') {
                        return value;
                    }
                }
                if (!mode || helperOptions.metadata.rendered) {
                    return value;
                } else if (mode === '#' || mode === '^') {
                    return function () {
                        var finalValue = canReflect.getValue(value);
                        var result;
                        if (helperOptions.metadata.rendered) {
                            result = finalValue;
                        } else if (typeof finalValue !== 'string' && canReflect.isListLike(finalValue)) {
                            var isObserveList = canReflect.isObservableLike(finalValue) && canReflect.isListLike(finalValue);
                            if (canReflect.getKeyValue(finalValue, 'length')) {
                                if (stringOnly) {
                                    result = utils.getItemsStringContent(finalValue, isObserveList, helperOptions);
                                } else {
                                    result = frag(utils.getItemsFragContent(finalValue, helperOptions, scope));
                                }
                            } else {
                                result = helperOptions.inverse(scope);
                            }
                        } else {
                            result = finalValue ? helperOptions.fn(finalValue || scope) : helperOptions.inverse(scope);
                        }
                        helperOptions.metadata.rendered = false;
                        return result;
                    };
                } else {
                }
            },
            makeLiveBindingPartialRenderer: function (expressionString, state) {
                expressionString = expressionString.trim();
                var exprData, partialName = expressionString.split(/\s+/).shift();
                if (partialName !== expressionString) {
                    exprData = core.expression.parse(expressionString);
                }
                return function (scope, parentSectionNodeList) {
                    var nodeList = [this];
                    nodeList.expression = '>' + partialName;
                    nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);
                    var partialFrag = new Observation(function () {
                        var localPartialName = partialName;
                        if (exprData && exprData.argExprs.length === 1) {
                            var newContext = canReflect.getValue(exprData.argExprs[0].value(scope));
                            if (typeof newContext === 'undefined') {
                            } else {
                                scope = scope.add(newContext);
                            }
                        }
                        var partial = canReflect.getKeyValue(scope.templateContext.partials, localPartialName);
                        var renderer;
                        if (partial) {
                            renderer = function () {
                                return partial.render ? partial.render(scope, nodeList) : partial(scope);
                            };
                        } else {
                            var scopePartialName = scope.read(localPartialName, { isArgument: true }).value;
                            if (scopePartialName === null || !scopePartialName && localPartialName[0] === '*') {
                                return frag('');
                            }
                            if (scopePartialName) {
                                localPartialName = scopePartialName;
                            }
                            renderer = function () {
                                if (typeof localPartialName === 'function') {
                                    return localPartialName(scope, {}, nodeList);
                                } else {
                                    var domRenderer = core.getTemplateById(localPartialName);
                                    return domRenderer ? domRenderer(scope, {}, nodeList) : getDocument().createDocumentFragment();
                                }
                            };
                        }
                        var res = ObservationRecorder.ignore(renderer)();
                        return frag(res);
                    });
                    canReflect.setPriority(partialFrag, nodeList.nesting);
                    live.html(this, partialFrag, this.parentNode, nodeList);
                };
            },
            makeStringBranchRenderer: function (mode, expressionString, state) {
                var exprData = core.expression.parse(expressionString), fullExpression = mode + expressionString;
                var branchRenderer = function branchRenderer(scope, truthyRenderer, falseyRenderer) {
                    var evaluator = scope.__cache[fullExpression];
                    if (mode || !evaluator) {
                        evaluator = makeEvaluator(scope, null, mode, exprData, truthyRenderer, falseyRenderer, true);
                        if (!mode) {
                            scope.__cache[fullExpression] = evaluator;
                        }
                    }
                    var gotObservableValue = evaluator[canSymbol.for('can.onValue')], res;
                    if (gotObservableValue) {
                        res = canReflect.getValue(evaluator);
                    } else {
                        res = evaluator();
                    }
                    return res == null ? '' : '' + res;
                };
                branchRenderer.exprData = exprData;
                return branchRenderer;
            },
            makeLiveBindingBranchRenderer: function (mode, expressionString, state) {
                var exprData = core.expression.parse(expressionString);
                if (!(exprData instanceof expression.Helper) && !(exprData instanceof expression.Call) && !(exprData instanceof expression.Bracket) && !(exprData instanceof expression.Lookup)) {
                    exprData = new expression.Helper(exprData, [], {});
                }
                var branchRenderer = function branchRenderer(scope, parentSectionNodeList, truthyRenderer, falseyRenderer) {
                    var stringOnly = state.tag;
                    var nodeList = [this];
                    nodeList.expression = expressionString;
                    nodeLists.register(nodeList, null, parentSectionNodeList || true, state.directlyNested);
                    var evaluator = makeEvaluator(scope, nodeList, mode, exprData, truthyRenderer, falseyRenderer, stringOnly);
                    var gotObservableValue = evaluator[canSymbol.for('can.onValue')];
                    var observable;
                    if (gotObservableValue) {
                        observable = evaluator;
                    } else {
                        observable = new Observation(evaluator, null, { isObservable: false });
                    }
                    if (canReflect.setPriority(observable, nodeList.nesting) === false) {
                        throw new Error('can-stache unable to set priority on observable');
                    }
                    canReflect.onValue(observable, k);
                    var value = canReflect.getValue(observable);
                    if (typeof value === 'function' && !(exprData instanceof expression.Lookup)) {
                        ObservationRecorder.ignore(value)(this);
                    } else if (canReflect.valueHasDependencies(observable)) {
                        if (state.attr) {
                            live.attr(this, state.attr, observable);
                        } else if (state.tag) {
                            live.attrs(this, observable);
                        } else if (state.text && !valueShouldBeInsertedAsHTML(value)) {
                            live.text(this, observable, this.parentNode, nodeList);
                        } else {
                            live.html(this, observable, this.parentNode, { nodeList: nodeList });
                        }
                    } else {
                        if (state.attr) {
                            domMutate.setAttribute(this, state.attr, value);
                        } else if (state.tag) {
                            live.attrs(this, value);
                        } else if (state.text && !valueShouldBeInsertedAsHTML(value)) {
                            this.nodeValue = live.makeString(value);
                        } else if (value != null) {
                            if (typeof value[viewInsertSymbol] === 'function') {
                                var insert = value[viewInsertSymbol]({ nodeList: nodeList });
                                var oldNodes = nodeLists.update(nodeList, [insert]);
                                nodeLists.replace(oldNodes, insert);
                            } else {
                                nodeLists.replace([this], frag(value, this.ownerDocument));
                            }
                        }
                    }
                    canReflect.offValue(observable, k);
                };
                branchRenderer.exprData = exprData;
                return branchRenderer;
            },
            splitModeFromExpression: function (expression, state) {
                expression = expression.trim();
                var mode = expression.charAt(0);
                if ('#/{&^>!<'.indexOf(mode) >= 0) {
                    expression = expression.substr(1).trim();
                } else {
                    mode = null;
                }
                if (mode === '{' && state.node) {
                    mode = null;
                }
                return {
                    mode: mode,
                    expression: expression
                };
            },
            cleanLineEndings: function (template) {
                return template.replace(mustacheLineBreakRegExp, function (whole, returnBefore, spaceBefore, special, expression, spaceAfter, returnAfter, spaceLessSpecial, spaceLessExpression, matchIndex) {
                    spaceAfter = spaceAfter || '';
                    returnBefore = returnBefore || '';
                    spaceBefore = spaceBefore || '';
                    var modeAndExpression = splitModeFromExpression(expression || spaceLessExpression, {});
                    if (spaceLessSpecial || '>{'.indexOf(modeAndExpression.mode) >= 0) {
                        return whole;
                    } else if ('^#!/'.indexOf(modeAndExpression.mode) >= 0) {
                        spaceBefore = returnBefore + spaceBefore && ' ';
                        return spaceBefore + special + (matchIndex !== 0 && returnAfter.length ? returnBefore + '\n' : '');
                    } else {
                        return spaceBefore + special + spaceAfter + (spaceBefore.length || matchIndex !== 0 ? returnBefore + '\n' : '');
                    }
                });
            },
            cleanWhitespaceControl: function (template) {
                return template.replace(mustacheWhitespaceRegExp, function (whole, spaceBefore, bracketBefore, controlBefore, expression, controlAfter, bracketAfter, spaceAfter, matchIndex) {
                    if (controlBefore === '-') {
                        spaceBefore = '';
                    }
                    if (controlAfter === '-') {
                        spaceAfter = '';
                    }
                    return spaceBefore + bracketBefore + expression + bracketAfter + spaceAfter;
                });
            },
            getTemplateById: function () {
            }
        };
        var makeEvaluator = core.makeEvaluator, splitModeFromExpression = core.splitModeFromExpression;
        module.exports = core;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-globals@1.2.0#base-url/base-url*/
define('can-globals@1.2.0#base-url/base-url', [
    'require',
    'exports',
    'module',
    '../can-globals-instance',
    '../global/global',
    '../document/document'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var globals = require('../can-globals-instance');
        require('../global/global');
        require('../document/document');
        globals.define('base-url', function () {
            var global = globals.getKeyValue('global');
            var domDocument = globals.getKeyValue('document');
            if (domDocument && 'baseURI' in domDocument) {
                return domDocument.baseURI;
            } else if (global.location) {
                var href = global.location.href;
                var lastSlash = href.lastIndexOf('/');
                return lastSlash !== -1 ? href.substr(0, lastSlash) : href;
            } else if (typeof process !== 'undefined') {
                return process.cwd();
            }
        });
        module.exports = globals.makeExport('base-url');
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-parse-uri@1.2.0#can-parse-uri*/
define('can-parse-uri@1.2.0#can-parse-uri', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    module.exports = namespace.parseURI = function (url) {
        var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
        return m ? {
            href: m[0] || '',
            protocol: m[1] || '',
            authority: m[2] || '',
            host: m[3] || '',
            hostname: m[4] || '',
            port: m[5] || '',
            pathname: m[6] || '',
            search: m[7] || '',
            hash: m[8] || ''
        } : null;
    };
});
/*can-join-uris@1.2.0#can-join-uris*/
define('can-join-uris@1.2.0#can-join-uris', [
    'require',
    'exports',
    'module',
    'can-namespace',
    'can-parse-uri'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var parseURI = require('can-parse-uri');
    module.exports = namespace.joinURIs = function (base, href) {
        function removeDotSegments(input) {
            var output = [];
            input.replace(/^(\.\.?(\/|$))+/, '').replace(/\/(\.(\/|$))+/g, '/').replace(/\/\.\.$/, '/../').replace(/\/?[^\/]*/g, function (p) {
                if (p === '/..') {
                    output.pop();
                } else {
                    output.push(p);
                }
            });
            return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
        }
        href = parseURI(href || '');
        base = parseURI(base || '');
        return !href || !base ? null : (href.protocol || base.protocol) + (href.protocol || href.authority ? href.authority : base.authority) + removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : href.pathname ? (base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname : base.pathname) + (href.protocol || href.authority || href.pathname ? href.search : href.search || base.search) + href.hash;
    };
});
/*can-stache@4.15.1#helpers/-debugger*/
define('can-stache@4.15.1#helpers/-debugger', [
    'require',
    'exports',
    'module',
    'can-log'
], function (require, exports, module) {
    'use strict';
    var canLog = require('can-log');
    function noop() {
    }
    var resolveValue = noop;
    var evaluateArgs = noop;
    var __testing = {};
    function debuggerHelper(left, right) {
        canLog.warn('Forgotten {{debugger}} helper');
    }
    debuggerHelper.requiresOptionsArgument = true;
    module.exports = {
        helper: debuggerHelper,
        evaluateArgs: evaluateArgs,
        resolveValue: resolveValue,
        __testing: __testing
    };
});
/*can-stache@4.15.1#src/truthy-observable*/
define('can-stache@4.15.1#src/truthy-observable', [
    'require',
    'exports',
    'module',
    'can-observation',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var Observation = require('can-observation');
    var canReflect = require('can-reflect');
    module.exports = function (observable) {
        return new Observation(function truthyObservation() {
            var val = canReflect.getValue(observable);
            return !!val;
        });
    };
});
/*can-dom-data@1.0.1#can-dom-data*/
define('can-dom-data@1.0.1#can-dom-data', [
    'require',
    'exports',
    'module',
    'can-namespace'
], function (require, exports, module) {
    'use strict';
    var namespace = require('can-namespace');
    var isEmptyObject = function (obj) {
        for (var prop in obj) {
            return false;
        }
        return true;
    };
    var data = new WeakMap();
    var deleteNode = function (node) {
        var nodeDeleted = false;
        if (data.has(node)) {
            nodeDeleted = true;
            data.delete(node);
        }
        return nodeDeleted;
    };
    var setData = function (node, name, value) {
        var store = data.get(node);
        if (store === undefined) {
            store = {};
            data.set(node, store);
        }
        if (name !== undefined) {
            store[name] = value;
        }
        return store;
    };
    var domData = {
        _data: data,
        get: function (node, key) {
            var store = data.get(node);
            return key === undefined ? store : store && store[key];
        },
        set: setData,
        clean: function (node, prop) {
            var itemData = data.get(node);
            if (itemData && itemData[prop]) {
                delete itemData[prop];
            }
            if (isEmptyObject(itemData)) {
                deleteNode(node);
            }
        },
        delete: deleteNode
    };
    if (namespace.domData) {
        throw new Error('You can\'t have two versions of can-dom-data, check your dependencies');
    } else {
        module.exports = namespace.domData = domData;
    }
});
/*can-stache@4.15.1#helpers/-for-of*/
define('can-stache@4.15.1#helpers/-for-of', [
    'require',
    'exports',
    'module',
    'can-stache-helpers',
    'can-reflect',
    'can-observation',
    'can-view-live',
    'can-view-nodelist',
    '../src/expression',
    '../src/key-observable'
], function (require, exports, module) {
    var helpers = require('can-stache-helpers');
    var canReflect = require('can-reflect');
    var Observation = require('can-observation');
    var live = require('can-view-live');
    var nodeLists = require('can-view-nodelist');
    var expression = require('../src/expression');
    var KeyObservable = require('../src/key-observable');
    var bindAndRead = function (value) {
        if (value && canReflect.isValueLike(value)) {
            Observation.temporarilyBind(value);
            return canReflect.getValue(value);
        } else {
            return value;
        }
    };
    function forOfObject(object, variableName, options) {
        var result = [];
        canReflect.each(object, function (val, key) {
            var value = new KeyObservable(object, key);
            var variableScope = {};
            if (variableName !== undefined) {
                variableScope[variableName] = value;
            }
            result.push(options.fn(options.scope.add({ key: key }, { special: true }).addLetContext(variableScope)));
        });
        return options.stringOnly ? result.join('') : result;
    }
    var forHelper = function (helperOptions) {
        if (helperOptions.exprData.argExprs.length !== 1) {
            throw new Error('for(of) broken syntax');
        }
        var helperExpr = helperOptions.exprData.argExprs[0].expr;
        var variableName, valueLookup, valueObservable;
        if (helperExpr instanceof expression.Lookup) {
            valueObservable = helperExpr.value(helperOptions.scope);
        } else if (helperExpr instanceof expression.Helper) {
            var inLookup = helperExpr.argExprs[0];
            if (inLookup.key !== 'of') {
                throw new Error('for(of) broken syntax');
            }
            variableName = helperExpr.methodExpr.key;
            valueLookup = helperExpr.argExprs[1];
            valueObservable = valueLookup.value(helperOptions.scope);
        }
        var items = valueObservable;
        var args = [].slice.call(arguments), options = args.pop(), resolved = bindAndRead(items);
        if (resolved && !canReflect.isListLike(resolved)) {
            return forOfObject(resolved, variableName, helperOptions);
        }
        if (options.stringOnly) {
            var parts = [];
            canReflect.eachIndex(resolved, function (value, index) {
                var variableScope = {};
                if (variableName !== undefined) {
                    variableScope[variableName] = value;
                }
                parts.push(helperOptions.fn(options.scope.add({ index: index }, { special: true }).addLetContext(variableScope)));
            });
            return parts.join('');
        } else {
            options.metadata.rendered = true;
            return function (el) {
                var nodeList = [el];
                nodeList.expression = 'live.list';
                nodeLists.register(nodeList, null, options.nodeList, true);
                nodeLists.update(options.nodeList, [el]);
                var cb = function (item, index, parentNodeList) {
                    var variableScope = {};
                    if (variableName !== undefined) {
                        variableScope[variableName] = item;
                    }
                    return options.fn(options.scope.add({ index: index }, { special: true }).addLetContext(variableScope), options.options, parentNodeList);
                };
                live.list(el, items, cb, options.context, el.parentNode, nodeList, function (list, parentNodeList) {
                    return options.inverse(options.scope.add(list), options.options, parentNodeList);
                });
            };
        }
    };
    forHelper.isLiveBound = true;
    forHelper.requiresOptionsArgument = true;
    forHelper.ignoreArgLookup = function ignoreArgLookup(index) {
        return index === 0;
    };
    helpers.for = forHelper;
});
/*can-stache@4.15.1#helpers/-let*/
define('can-stache@4.15.1#helpers/-let', [
    'require',
    'exports',
    'module',
    'can-stache-helpers',
    'can-reflect'
], function (require, exports, module) {
    var helpers = require('can-stache-helpers');
    var canReflect = require('can-reflect');
    function isVariable(scope) {
        return scope._meta.variable === true;
    }
    helpers['let'] = function (options) {
        var variableScope = options.scope.getScope(isVariable);
        if (!variableScope) {
            throw new Error('There is no variable scope!');
        }
        canReflect.assignMap(variableScope._context, options.hash);
        return document.createTextNode('');
    };
});
/*can-stache@4.15.1#helpers/core*/
define('can-stache@4.15.1#helpers/core', [
    'require',
    'exports',
    'module',
    'can-view-live',
    'can-view-nodelist',
    '../src/utils',
    'can-globals/base-url/base-url',
    'can-join-uris',
    'can-assign',
    'can-log/dev/dev',
    'can-reflect',
    './-debugger',
    '../src/key-observable',
    'can-observation',
    '../src/truthy-observable',
    'can-stache-helpers',
    'can-dom-data',
    'can-dom-data-state',
    './-for-of',
    './-let'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var live = require('can-view-live');
        var nodeLists = require('can-view-nodelist');
        var utils = require('../src/utils');
        var getBaseURL = require('can-globals/base-url/base-url');
        var joinURIs = require('can-join-uris');
        var assign = require('can-assign');
        var dev = require('can-log/dev/dev');
        var canReflect = require('can-reflect');
        var debuggerHelper = require('./-debugger').helper;
        var KeyObservable = require('../src/key-observable');
        var Observation = require('can-observation');
        var TruthyObservable = require('../src/truthy-observable');
        var helpers = require('can-stache-helpers');
        var domData = require('can-dom-data');
        var domDataState = require('can-dom-data-state');
        require('./-for-of');
        require('./-let');
        var builtInHelpers = {};
        var helpersCore = {
            looksLikeOptions: function (options) {
                return options && typeof options.fn === 'function' && typeof options.inverse === 'function';
            },
            resolve: function (value) {
                if (value && canReflect.isValueLike(value)) {
                    return canReflect.getValue(value);
                } else {
                    return value;
                }
            },
            resolveHash: function (hash) {
                var params = {};
                for (var prop in hash) {
                    params[prop] = helpersCore.resolve(hash[prop]);
                }
                return params;
            },
            bindAndRead: function (value) {
                if (value && canReflect.isValueLike(value)) {
                    Observation.temporarilyBind(value);
                    return canReflect.getValue(value);
                } else {
                    return value;
                }
            },
            registerHelper: function (name, callback) {
                callback.requiresOptionsArgument = true;
                helpers[name] = callback;
            },
            registerHelpers: function (helpers) {
                var name, callback;
                for (name in helpers) {
                    callback = helpers[name];
                    helpersCore.registerHelper(name, helpersCore.makeSimpleHelper(callback));
                }
            },
            makeSimpleHelper: function (fn) {
                return function () {
                    var realArgs = [];
                    canReflect.eachIndex(arguments, function (val) {
                        while (val && val.isComputed) {
                            val = val();
                        }
                        realArgs.push(val);
                    });
                    return fn.apply(this, realArgs);
                };
            },
            addHelper: function (name, callback) {
                if (typeof name === 'object') {
                    return helpersCore.registerHelpers(name);
                }
                return helpersCore.registerHelper(name, helpersCore.makeSimpleHelper(callback));
            },
            addLiveHelper: function (name, callback) {
                callback.isLiveBound = true;
                return helpersCore.registerHelper(name, callback);
            },
            getHelper: function (name, scope) {
                var helper = scope && scope.getHelper(name);
                if (!helper) {
                    helper = helpers[name];
                }
                return helper;
            },
            __resetHelpers: function () {
                for (var helper in helpers) {
                    delete helpers[helper];
                }
                helpersCore.addBuiltInHelpers();
            },
            addBuiltInHelpers: function () {
                canReflect.each(builtInHelpers, function (helper, helperName) {
                    helpers[helperName] = helper;
                });
            },
            _makeLogicHelper: function (name, logic) {
                var logicHelper = assign(function () {
                    var args = Array.prototype.slice.call(arguments, 0), options;
                    if (helpersCore.looksLikeOptions(args[args.length - 1])) {
                        options = args.pop();
                    }
                    function callLogic() {
                        if (options) {
                            return logic(args) ? true : false;
                        } else {
                            return logic(args);
                        }
                    }
                    var callFn = new Observation(callLogic);
                    if (options) {
                        return callFn.get() ? options.fn() : options.inverse();
                    } else {
                        return callFn.get();
                    }
                }, {
                    requiresOptionsArgument: true,
                    isLiveBound: true
                });
                return logicHelper;
            }
        };
        var ifHelper = assign(function ifHelper(expr, options) {
            var value;
            if (expr && canReflect.isValueLike(expr)) {
                value = canReflect.getValue(new TruthyObservable(expr));
            } else {
                value = !!helpersCore.resolve(expr);
            }
            if (value) {
                return options.fn(options.scope || this);
            } else {
                return options.inverse(options.scope || this);
            }
        }, {
            requiresOptionsArgument: true,
            isLiveBound: true
        });
        var isHelper = helpersCore._makeLogicHelper('eq', function eqHelper(args) {
            var curValue, lastValue;
            for (var i = 0; i < args.length; i++) {
                curValue = helpersCore.resolve(args[i]);
                curValue = typeof curValue === 'function' ? curValue() : curValue;
                if (i > 0) {
                    if (curValue !== lastValue) {
                        return false;
                    }
                }
                lastValue = curValue;
            }
            return true;
        });
        var andHelper = helpersCore._makeLogicHelper('and', function andHelper(args) {
            if (args.length === 0) {
                return false;
            }
            var last;
            for (var i = 0, len = args.length; i < len; i++) {
                last = helpersCore.resolve(args[i]);
                if (!last) {
                    return last;
                }
            }
            return last;
        });
        var orHelper = helpersCore._makeLogicHelper('or', function orHelper(args) {
            if (args.length === 0) {
                return false;
            }
            var last;
            for (var i = 0, len = args.length; i < len; i++) {
                last = helpersCore.resolve(args[i]);
                if (last) {
                    return last;
                }
            }
            return last;
        });
        var switchHelper = function (expression, options) {
            helpersCore.resolve(expression);
            var found = false;
            var caseHelper = function (value, options) {
                if (!found && helpersCore.resolve(expression) === helpersCore.resolve(value)) {
                    found = true;
                    return options.fn(options.scope.peek('this') || this);
                }
            };
            caseHelper.requiresOptionsArgument = true;
            var defaultHelper = function (options) {
                if (!found) {
                    return options ? options.scope.peek('this') : true;
                }
            };
            defaultHelper.requiresOptionsArgument = true;
            canReflect.assignSymbols(defaultHelper, {
                'can.isValueLike': true,
                'can.isFunctionLike': false,
                'can.getValue': function () {
                    return this(options);
                }
            });
            var newScope = options.scope.add({
                case: caseHelper,
                default: defaultHelper
            }, { notContext: true });
            return options.fn(newScope, options);
        };
        switchHelper.requiresOptionsArgument = true;
        var domDataHelper = function (attr, value) {
            var data = (helpersCore.looksLikeOptions(value) ? value.context : value) || this;
            return function setDomData(el) {
                domData.set(el, attr, data);
            };
        };
        var joinBaseHelper = function (firstExpr) {
            var args = [].slice.call(arguments);
            var options = args.pop();
            var moduleReference = args.map(function (expr) {
                var value = helpersCore.resolve(expr);
                return typeof value === 'function' ? value() : value;
            }).join('');
            var templateModule = canReflect.getKeyValue(options.scope.templateContext.helpers, 'module');
            var parentAddress = templateModule ? templateModule.uri : undefined;
            var isRelative = moduleReference[0] === '.';
            if (isRelative && parentAddress) {
                return joinURIs(parentAddress, moduleReference);
            } else {
                var baseURL = typeof System !== 'undefined' && (System.renderingBaseURL || System.baseURL) || getBaseURL();
                if (moduleReference[0] !== '/' && baseURL[baseURL.length - 1] !== '/') {
                    baseURL += '/';
                }
                return joinURIs(baseURL, moduleReference);
            }
        };
        joinBaseHelper.requiresOptionsArgument = true;
        var eachHelper = function (items) {
            var args = [].slice.call(arguments), options = args.pop(), hashExprs = options.exprData.hashExprs, resolved = helpersCore.bindAndRead(items), hashOptions, aliases;
            if (canReflect.size(hashExprs) > 0) {
                hashOptions = {};
                canReflect.eachKey(hashExprs, function (exprs, key) {
                    hashOptions[exprs.key] = key;
                });
            }
            if ((canReflect.isObservableLike(resolved) && canReflect.isListLike(resolved) || canReflect.isListLike(resolved) && canReflect.isValueLike(items)) && !options.stringOnly) {
                options.metadata.rendered = true;
                return function (el) {
                    var nodeList = [el];
                    nodeList.expression = 'live.list';
                    nodeLists.register(nodeList, null, options.nodeList, true);
                    nodeLists.update(options.nodeList, [el]);
                    var cb = function (item, index, parentNodeList) {
                        var aliases = {};
                        if (canReflect.size(hashOptions) > 0) {
                            if (hashOptions.value) {
                                aliases[hashOptions.value] = item;
                            }
                            if (hashOptions.index) {
                                aliases[hashOptions.index] = index;
                            }
                        }
                        return options.fn(options.scope.add(aliases, { notContext: true }).add({ index: index }, { special: true }).add(item), options.options, parentNodeList);
                    };
                    live.list(el, items, cb, options.context, el.parentNode, nodeList, function (list, parentNodeList) {
                        return options.inverse(options.scope.add(list), options.options, parentNodeList);
                    });
                };
            }
            var expr = helpersCore.resolve(items), result;
            if (!!expr && canReflect.isListLike(expr)) {
                result = utils.getItemsFragContent(expr, options, options.scope);
                return options.stringOnly ? result.join('') : result;
            } else if (canReflect.isObservableLike(expr) && canReflect.isMapLike(expr) || expr instanceof Object) {
                result = [];
                canReflect.each(expr, function (val, key) {
                    var value = new KeyObservable(expr, key);
                    aliases = {};
                    if (canReflect.size(hashOptions) > 0) {
                        if (hashOptions.value) {
                            aliases[hashOptions.value] = value;
                        }
                        if (hashOptions.key) {
                            aliases[hashOptions.key] = key;
                        }
                    }
                    result.push(options.fn(options.scope.add(aliases, { notContext: true }).add({ key: key }, { special: true }).add(value)));
                });
                return options.stringOnly ? result.join('') : result;
            }
        };
        eachHelper.isLiveBound = true;
        eachHelper.requiresOptionsArgument = true;
        eachHelper.ignoreArgLookup = function ignoreArgLookup(index) {
            return index === 1;
        };
        var indexHelper = assign(function indexHelper(offset, options) {
            if (!options) {
                options = offset;
                offset = 0;
            }
            var index = options.scope.peek('scope.index');
            return '' + ((typeof index === 'function' ? index() : index) + offset);
        }, { requiresOptionsArgument: true });
        var withHelper = function (expr, options) {
            var ctx = expr;
            if (!options) {
                options = expr;
                expr = true;
                ctx = options.hash;
            } else {
                expr = helpersCore.resolve(expr);
                if (options.hash && canReflect.size(options.hash) > 0) {
                    ctx = options.scope.add(options.hash, { notContext: true }).add(ctx);
                }
            }
            return options.fn(ctx || {});
        };
        withHelper.requiresOptionsArgument = true;
        var dataHelper = function (attr, value) {
            var data = (helpersCore.looksLikeOptions(value) ? value.context : value) || this;
            return function setData(el) {
                domDataState.set.call(el, attr, data);
            };
        };
        var unlessHelper = function (expr, options) {
            return ifHelper.apply(this, [
                expr,
                assign(assign({}, options), {
                    fn: options.inverse,
                    inverse: options.fn
                })
            ]);
        };
        unlessHelper.requiresOptionsArgument = true;
        unlessHelper.isLiveBound = true;
        var builtInHelpers = {
            'debugger': debuggerHelper,
            each: eachHelper,
            eachOf: eachHelper,
            index: indexHelper,
            'if': ifHelper,
            is: isHelper,
            eq: isHelper,
            unless: unlessHelper,
            'with': withHelper,
            console: console,
            data: dataHelper,
            domData: domDataHelper,
            'switch': switchHelper,
            joinBase: joinBaseHelper,
            and: andHelper,
            or: orHelper
        };
        helpersCore.addBuiltInHelpers();
        module.exports = helpersCore;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-stache@4.15.1#helpers/converter*/
define('can-stache@4.15.1#helpers/converter', [
    'require',
    'exports',
    'module',
    './core',
    '../src/set-identifier',
    'can-reflect'
], function (require, exports, module) {
    'use strict';
    var helpers = require('./core');
    var SetIdentifier = require('../src/set-identifier');
    var canReflect = require('can-reflect');
    function makeConverter(getterSetter) {
        getterSetter = getterSetter || {};
        return function (newVal, source) {
            var args = canReflect.toArray(arguments);
            if (newVal instanceof SetIdentifier) {
                return typeof getterSetter.set === 'function' ? getterSetter.set.apply(this, [newVal.value].concat(args.slice(1))) : source(newVal.value);
            } else {
                return typeof getterSetter.get === 'function' ? getterSetter.get.apply(this, args) : args[0];
            }
        };
    }
    var converterPackages = new WeakMap();
    helpers.addConverter = function (name, getterSetter) {
        if (typeof name === 'object') {
            if (!converterPackages.has(name)) {
                converterPackages.set(name, true);
                canReflect.eachKey(name, function (getterSetter, name) {
                    helpers.addConverter(name, getterSetter);
                });
            }
            return;
        }
        var helper = makeConverter(getterSetter);
        helper.isLiveBound = true;
        helpers.registerHelper(name, helper);
    };
    helpers.registerConverter = function (name, getterSetter) {
        helpers.registerHelper(name, makeConverter(getterSetter));
    };
    var converterHelpers = {
        'not': {
            get: function (obs, options) {
                if (helpers.looksLikeOptions(options)) {
                    return canReflect.getValue(obs) ? options.inverse() : options.fn();
                } else {
                    return !canReflect.getValue(obs);
                }
            },
            set: function (newVal, obs) {
                canReflect.setValue(obs, !newVal);
            }
        }
    };
    helpers.addConverter(converterHelpers);
    module.exports = helpers;
});
/*can-stache-ast@1.1.0#controls*/
define('can-stache-ast@1.1.0#controls', function (require, exports, module) {
    'use strict';
    var mustacheLineBreakRegExp = /(?:(^|\r?\n)(\s*)(\{\{([\s\S]*)\}\}\}?)([^\S\n\r]*)($|\r?\n))|(\{\{([\s\S]*)\}\}\}?)/g, mustacheWhitespaceRegExp = /(\s*)(\{\{\{?)(-?)([\s\S]*?)(-?)(\}\}\}?)(\s*)/g;
    function splitModeFromExpression(expression, state) {
        expression = expression.trim();
        var mode = expression.charAt(0);
        if ('#/{&^>!<'.indexOf(mode) >= 0) {
            expression = expression.substr(1).trim();
        } else {
            mode = null;
        }
        if (mode === '{' && state.node) {
            mode = null;
        }
        return {
            mode: mode,
            expression: expression
        };
    }
    function cleanLineEndings(template) {
        return template.replace(mustacheLineBreakRegExp, function (whole, returnBefore, spaceBefore, special, expression, spaceAfter, returnAfter, spaceLessSpecial, spaceLessExpression, matchIndex) {
            spaceAfter = spaceAfter || '';
            returnBefore = returnBefore || '';
            spaceBefore = spaceBefore || '';
            var modeAndExpression = splitModeFromExpression(expression || spaceLessExpression, {});
            if (spaceLessSpecial || '>{'.indexOf(modeAndExpression.mode) >= 0) {
                return whole;
            } else if ('^#!/'.indexOf(modeAndExpression.mode) >= 0) {
                spaceBefore = returnBefore + spaceBefore && ' ';
                return spaceBefore + special + (matchIndex !== 0 && returnAfter.length ? returnBefore + '\n' : '');
            } else {
                return spaceBefore + special + spaceAfter + (spaceBefore.length || matchIndex !== 0 ? returnBefore + '\n' : '');
            }
        });
    }
    function whiteSpaceReplacement(whole, spaceBefore, bracketBefore, controlBefore, expression, controlAfter, bracketAfter, spaceAfter) {
        if (controlBefore === '-') {
            spaceBefore = '';
        }
        if (controlAfter === '-') {
            spaceAfter = '';
        }
        return spaceBefore + bracketBefore + expression + bracketAfter + spaceAfter;
    }
    function cleanWhitespaceControl(template) {
        return template.replace(mustacheWhitespaceRegExp, whiteSpaceReplacement);
    }
    exports.cleanLineEndings = cleanLineEndings;
    exports.cleanWhitespaceControl = cleanWhitespaceControl;
});
/*can-stache-ast@1.1.0#can-stache-ast*/
define('can-stache-ast@1.1.0#can-stache-ast', [
    'require',
    'exports',
    'module',
    './controls',
    'can-view-parser'
], function (require, exports, module) {
    'use strict';
    var controls = require('./controls');
    var parser = require('can-view-parser');
    exports.parse = function (filename, source) {
        if (arguments.length === 1) {
            source = arguments[0];
            filename = undefined;
        }
        var template = source;
        template = controls.cleanWhitespaceControl(template);
        template = controls.cleanLineEndings(template);
        var imports = [], dynamicImports = [], importDeclarations = [], ases = {}, attributes = new Map(), inImport = false, inFrom = false, inAs = false, isUnary = false, importIsDynamic = false, currentAs = '', currentFrom = '', currentAttrName = null;
        function processImport(line) {
            if (currentAs) {
                ases[currentAs] = currentFrom;
                currentAs = '';
            }
            if (importIsDynamic) {
                dynamicImports.push(currentFrom);
            } else {
                imports.push(currentFrom);
            }
            importDeclarations.push({
                specifier: currentFrom,
                loc: { line: line },
                attributes: attributes
            });
            attributes = new Map();
        }
        var program = parser(template, {
            filename: filename,
            start: function (tagName, unary) {
                if (tagName === 'can-import') {
                    isUnary = unary;
                    importIsDynamic = false;
                    inImport = true;
                } else if (tagName === 'can-dynamic-import') {
                    isUnary = unary;
                    importIsDynamic = true;
                    inImport = true;
                } else if (inImport) {
                    importIsDynamic = true;
                    inImport = false;
                }
            },
            attrStart: function (attrName) {
                currentAttrName = attrName;
                attributes.set(currentAttrName, true);
                if (attrName === 'from') {
                    inFrom = true;
                } else if (attrName === 'as' || attrName === 'export-as') {
                    inAs = true;
                }
            },
            attrEnd: function (attrName) {
                if (attrName === 'from') {
                    inFrom = false;
                } else if (attrName === 'as' || attrName === 'export-as') {
                    inAs = false;
                }
            },
            attrValue: function (value) {
                if (inImport) {
                    attributes.set(currentAttrName, value);
                }
                if (inFrom && inImport) {
                    currentFrom = value;
                } else if (inAs && inImport) {
                    currentAs = value;
                }
            },
            end: function (tagName, unary, line) {
                if ((tagName === 'can-import' || tagName === 'can-dynamic-import') && isUnary) {
                    processImport(line);
                }
            },
            close: function (tagName, unary, line) {
                if (tagName === 'can-import' || tagName === 'can-dynamic-import') {
                    processImport(line);
                }
            },
            chars: function (text) {
                if (text.trim().length > 0) {
                    importIsDynamic = true;
                }
            },
            special: function () {
                importIsDynamic = true;
            }
        }, true);
        return {
            intermediate: program,
            program: program,
            imports: imports,
            dynamicImports: dynamicImports,
            importDeclarations: importDeclarations,
            ases: ases,
            exports: ases
        };
    };
});
/*can-import-module@1.2.0#can-import-module*/
define('can-import-module@1.2.0#can-import-module', [
    'require',
    'exports',
    'module',
    'can-globals/global/global',
    'can-namespace'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getGlobal = require('can-globals/global/global');
        var namespace = require('can-namespace');
        module.exports = namespace.import = function (moduleName, parentName) {
            return new Promise(function (resolve, reject) {
                try {
                    var global = getGlobal();
                    if (typeof global.System === 'object' && isFunction(global.System['import'])) {
                        global.System['import'](moduleName, { name: parentName }).then(resolve, reject);
                    } else if (global.define && global.define.amd) {
                        global.require([moduleName], function (value) {
                            resolve(value);
                        });
                    } else if (global.require) {
                        resolve(global.require(moduleName));
                    } else {
                        if (typeof stealRequire !== 'undefined') {
                            steal.import(moduleName, { name: parentName }).then(resolve, reject);
                        } else {
                            resolve();
                        }
                    }
                } catch (err) {
                    reject(err);
                }
            });
        };
        function isFunction(fn) {
            return typeof fn === 'function';
        }
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-stache@4.15.1#can-stache*/
define('can-stache@4.15.1#can-stache', [
    'require',
    'exports',
    'module',
    'can-view-parser',
    'can-view-callbacks',
    './src/html_section',
    './src/text_section',
    './src/mustache_core',
    './helpers/core',
    './helpers/converter',
    'can-stache-ast',
    './src/utils',
    'can-attribute-encoder',
    'can-log/dev/dev',
    'can-namespace',
    'can-globals/document/document',
    'can-assign',
    'can-import-module',
    'can-reflect',
    'can-view-scope',
    'can-view-scope/template-context',
    'can-observation-recorder',
    'can-symbol',
    'can-view-target',
    'can-view-nodelist'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var parser = require('can-view-parser');
        var viewCallbacks = require('can-view-callbacks');
        var HTMLSectionBuilder = require('./src/html_section');
        var TextSectionBuilder = require('./src/text_section');
        var mustacheCore = require('./src/mustache_core');
        var mustacheHelpers = require('./helpers/core');
        require('./helpers/converter');
        var getIntermediateAndImports = require('can-stache-ast').parse;
        var utils = require('./src/utils');
        var makeRendererConvertScopes = utils.makeRendererConvertScopes;
        var last = utils.last;
        var attributeEncoder = require('can-attribute-encoder');
        var dev = require('can-log/dev/dev');
        var namespace = require('can-namespace');
        var DOCUMENT = require('can-globals/document/document');
        var assign = require('can-assign');
        var importer = require('can-import-module');
        var canReflect = require('can-reflect');
        var Scope = require('can-view-scope');
        var TemplateContext = require('can-view-scope/template-context');
        var ObservationRecorder = require('can-observation-recorder');
        var canSymbol = require('can-symbol');
        require('can-view-target');
        require('can-view-nodelist');
        if (!viewCallbacks.tag('content')) {
            viewCallbacks.tag('content', function (el, tagData) {
                return tagData.scope;
            });
        }
        var isViewSymbol = canSymbol.for('can.isView');
        var wrappedAttrPattern = /[{(].*[)}]/;
        var colonWrappedAttrPattern = /^on:|(:to|:from|:bind)$|.*:to:on:.*/;
        var svgNamespace = 'http://www.w3.org/2000/svg';
        var namespaces = {
                'svg': svgNamespace,
                'g': svgNamespace
            }, textContentOnlyTag = {
                style: true,
                script: true
            };
        function stache(filename, template) {
            if (arguments.length === 1) {
                template = arguments[0];
                filename = undefined;
            }
            var inlinePartials = {};
            if (typeof template === 'string') {
                template = mustacheCore.cleanWhitespaceControl(template);
                template = mustacheCore.cleanLineEndings(template);
            }
            var section = new HTMLSectionBuilder(filename), state = {
                    node: null,
                    attr: null,
                    sectionElementStack: [],
                    text: false,
                    namespaceStack: [],
                    textContentOnly: null
                }, makeRendererAndUpdateSection = function (section, mode, stache, lineNo) {
                    if (mode === '>') {
                        section.add(mustacheCore.makeLiveBindingPartialRenderer(stache, copyState({
                            filename: section.filename,
                            lineNo: lineNo
                        })));
                    } else if (mode === '/') {
                        var createdSection = section.last();
                        if (createdSection.startedWith === '<') {
                            inlinePartials[stache] = section.endSubSectionAndReturnRenderer();
                            section.removeCurrentNode();
                        } else {
                            section.endSection();
                        }
                        if (section instanceof HTMLSectionBuilder) {
                            state.sectionElementStack.pop();
                        }
                    } else if (mode === 'else') {
                        section.inverse();
                    } else {
                        var makeRenderer = section instanceof HTMLSectionBuilder ? mustacheCore.makeLiveBindingBranchRenderer : mustacheCore.makeStringBranchRenderer;
                        if (mode === '{' || mode === '&') {
                            section.add(makeRenderer(null, stache, copyState({
                                filename: section.filename,
                                lineNo: lineNo
                            })));
                        } else if (mode === '#' || mode === '^' || mode === '<') {
                            var renderer = makeRenderer(mode, stache, copyState({
                                filename: section.filename,
                                lineNo: lineNo
                            }));
                            var sectionItem = { type: 'section' };
                            section.startSection(renderer);
                            section.last().startedWith = mode;
                            if (section instanceof HTMLSectionBuilder) {
                                state.sectionElementStack.push(sectionItem);
                            }
                        } else {
                            section.add(makeRenderer(null, stache, copyState({
                                text: true,
                                filename: section.filename,
                                lineNo: lineNo
                            })));
                        }
                    }
                }, isDirectlyNested = function () {
                    var lastElement = state.sectionElementStack[state.sectionElementStack.length - 1];
                    return state.sectionElementStack.length ? lastElement.type === 'section' || lastElement.type === 'custom' : true;
                }, copyState = function (overwrites) {
                    var cur = {
                        tag: state.node && state.node.tag,
                        attr: state.attr && state.attr.name,
                        directlyNested: isDirectlyNested(),
                        textContentOnly: !!state.textContentOnly
                    };
                    return overwrites ? assign(cur, overwrites) : cur;
                }, addAttributesCallback = function (node, callback) {
                    if (!node.attributes) {
                        node.attributes = [];
                    }
                    node.attributes.unshift(callback);
                };
            parser(template, {
                filename: filename,
                start: function (tagName, unary, lineNo) {
                    var matchedNamespace = namespaces[tagName];
                    if (matchedNamespace && !unary) {
                        state.namespaceStack.push(matchedNamespace);
                    }
                    state.node = {
                        tag: tagName,
                        children: [],
                        namespace: matchedNamespace || last(state.namespaceStack)
                    };
                },
                end: function (tagName, unary, lineNo) {
                    var isCustomTag = viewCallbacks.tag(tagName);
                    var directlyNested = isDirectlyNested();
                    if (unary) {
                        section.add(state.node);
                        if (isCustomTag) {
                            addAttributesCallback(state.node, function (scope, parentNodeList) {
                                viewCallbacks.tagHandler(this, tagName, {
                                    scope: scope,
                                    subtemplate: null,
                                    templateType: 'stache',
                                    parentNodeList: parentNodeList,
                                    directlyNested: directlyNested
                                });
                            });
                        }
                    } else {
                        section.push(state.node);
                        state.sectionElementStack.push({
                            type: isCustomTag ? 'custom' : null,
                            tag: isCustomTag ? null : tagName,
                            templates: {},
                            directlyNested: directlyNested
                        });
                        if (isCustomTag) {
                            section.startSubSection();
                        } else if (textContentOnlyTag[tagName]) {
                            state.textContentOnly = new TextSectionBuilder();
                        }
                    }
                    state.node = null;
                },
                close: function (tagName, lineNo) {
                    var matchedNamespace = namespaces[tagName];
                    if (matchedNamespace) {
                        state.namespaceStack.pop();
                    }
                    var isCustomTag = viewCallbacks.tag(tagName), renderer;
                    if (isCustomTag) {
                        renderer = section.endSubSectionAndReturnRenderer();
                    }
                    if (textContentOnlyTag[tagName]) {
                        section.last().add(state.textContentOnly.compile(copyState()));
                        state.textContentOnly = null;
                    }
                    var oldNode = section.pop();
                    if (isCustomTag) {
                        if (tagName === 'can-template') {
                            var parent = state.sectionElementStack[state.sectionElementStack.length - 2];
                            if (renderer) {
                                parent.templates[oldNode.attrs.name] = makeRendererConvertScopes(renderer);
                            }
                            section.removeCurrentNode();
                        } else {
                            var current = state.sectionElementStack[state.sectionElementStack.length - 1];
                            addAttributesCallback(oldNode, function (scope, parentNodeList) {
                                viewCallbacks.tagHandler(this, tagName, {
                                    scope: scope,
                                    subtemplate: renderer ? makeRendererConvertScopes(renderer) : renderer,
                                    templateType: 'stache',
                                    parentNodeList: parentNodeList,
                                    templates: current.templates,
                                    directlyNested: current.directlyNested
                                });
                            });
                        }
                    }
                    state.sectionElementStack.pop();
                },
                attrStart: function (attrName, lineNo) {
                    if (state.node.section) {
                        state.node.section.add(attrName + '="');
                    } else {
                        state.attr = {
                            name: attrName,
                            value: ''
                        };
                    }
                },
                attrEnd: function (attrName, lineNo) {
                    if (state.node.section) {
                        state.node.section.add('" ');
                    } else {
                        if (!state.node.attrs) {
                            state.node.attrs = {};
                        }
                        state.node.attrs[state.attr.name] = state.attr.section ? state.attr.section.compile(copyState()) : state.attr.value;
                        var attrCallback = viewCallbacks.attr(attrName);
                        if (attrCallback) {
                            if (!state.node.attributes) {
                                state.node.attributes = [];
                            }
                            state.node.attributes.push(function (scope, nodeList) {
                                attrCallback(this, {
                                    attributeName: attrName,
                                    scope: scope,
                                    nodeList: nodeList
                                });
                            });
                        }
                        state.attr = null;
                    }
                },
                attrValue: function (value, lineNo) {
                    var section = state.node.section || state.attr.section;
                    if (section) {
                        section.add(value);
                    } else {
                        state.attr.value += value;
                    }
                },
                chars: function (text, lineNo) {
                    (state.textContentOnly || section).add(text);
                },
                special: function (text, lineNo) {
                    var firstAndText = mustacheCore.splitModeFromExpression(text, state), mode = firstAndText.mode, expression = firstAndText.expression;
                    if (expression === 'else') {
                        var inverseSection;
                        if (state.attr && state.attr.section) {
                            inverseSection = state.attr.section;
                        } else if (state.node && state.node.section) {
                            inverseSection = state.node.section;
                        } else {
                            inverseSection = state.textContentOnly || section;
                        }
                        inverseSection.inverse();
                        return;
                    }
                    if (mode === '!') {
                        return;
                    }
                    if (state.node && state.node.section) {
                        makeRendererAndUpdateSection(state.node.section, mode, expression, lineNo);
                        if (state.node.section.subSectionDepth() === 0) {
                            state.node.attributes.push(state.node.section.compile(copyState()));
                            delete state.node.section;
                        }
                    } else if (state.attr) {
                        if (!state.attr.section) {
                            state.attr.section = new TextSectionBuilder();
                            if (state.attr.value) {
                                state.attr.section.add(state.attr.value);
                            }
                        }
                        makeRendererAndUpdateSection(state.attr.section, mode, expression, lineNo);
                    } else if (state.node) {
                        if (!state.node.attributes) {
                            state.node.attributes = [];
                        }
                        if (!mode) {
                            state.node.attributes.push(mustacheCore.makeLiveBindingBranchRenderer(null, expression, copyState({
                                filename: section.filename,
                                lineNo: lineNo
                            })));
                        } else if (mode === '#' || mode === '^') {
                            if (!state.node.section) {
                                state.node.section = new TextSectionBuilder();
                            }
                            makeRendererAndUpdateSection(state.node.section, mode, expression, lineNo);
                        } else {
                            throw new Error(mode + ' is currently not supported within a tag.');
                        }
                    } else {
                        makeRendererAndUpdateSection(state.textContentOnly || section, mode, expression, lineNo);
                    }
                },
                comment: function (text) {
                    section.add({ comment: text });
                },
                done: function (lineNo) {
                }
            });
            var renderer = section.compile();
            var scopifiedRenderer = ObservationRecorder.ignore(function (scope, options, nodeList) {
                if (nodeList === undefined && canReflect.isListLike(options)) {
                    nodeList = options;
                    options = undefined;
                }
                if (options && !options.helpers && !options.partials && !options.tags) {
                    options = { helpers: options };
                }
                canReflect.eachKey(options && options.helpers, function (helperValue) {
                    helperValue.requiresOptionsArgument = true;
                });
                var templateContext = new TemplateContext(options);
                canReflect.eachKey(inlinePartials, function (partial, partialName) {
                    canReflect.setKeyValue(templateContext.partials, partialName, partial);
                });
                canReflect.setKeyValue(templateContext, 'view', scopifiedRenderer);
                if (!(scope instanceof Scope)) {
                    scope = new Scope(templateContext).add(scope);
                } else {
                    var templateContextScope = new Scope(templateContext);
                    templateContextScope._parent = scope._parent;
                    scope._parent = templateContextScope;
                }
                return renderer(scope.addLetContext(), nodeList);
            });
            scopifiedRenderer[isViewSymbol] = true;
            return scopifiedRenderer;
        }
        assign(stache, mustacheHelpers);
        stache.safeString = function (text) {
            return canReflect.assignSymbols({}, {
                'can.toDOM': function () {
                    return text;
                }
            });
        };
        stache.async = function (source) {
            var iAi = getIntermediateAndImports(source);
            var importPromises = iAi.imports.map(function (moduleName) {
                return importer(moduleName);
            });
            return Promise.all(importPromises).then(function () {
                return stache(iAi.intermediate);
            });
        };
        var templates = {};
        stache.from = mustacheCore.getTemplateById = function (id) {
            if (!templates[id]) {
                var el = DOCUMENT().getElementById(id);
                if (el) {
                    templates[id] = stache('#' + id, el.innerHTML);
                }
            }
            return templates[id];
        };
        stache.registerPartial = function (id, partial) {
            templates[id] = typeof partial === 'string' ? stache(partial) : partial;
        };
        stache.addBindings = viewCallbacks.attrs;
        module.exports = namespace.stache = stache;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-view-import@4.2.0#can-view-import*/
define('can-view-import@4.2.0#can-view-import', [
    'require',
    'exports',
    'module',
    'can-assign',
    'can-dom-data-state',
    'can-symbol',
    'can-globals/document/document',
    'can-child-nodes',
    'can-import-module',
    'can-dom-mutate',
    'can-dom-mutate/node',
    'can-view-nodelist',
    'can-view-callbacks',
    'can-log/',
    'can-log/dev/dev'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var assign = require('can-assign');
        var canData = require('can-dom-data-state');
        var canSymbol = require('can-symbol');
        var DOCUMENT = require('can-globals/document/document');
        var getChildNodes = require('can-child-nodes');
        var importer = require('can-import-module');
        var domMutate = require('can-dom-mutate');
        var domMutateNode = require('can-dom-mutate/node');
        var nodeLists = require('can-view-nodelist');
        var viewCallbacks = require('can-view-callbacks');
        var tag = viewCallbacks.tag;
        var canLog = require('can-log/');
        var dev = require('can-log/dev/dev');
        function setViewModel(element, viewModel) {
            element[canSymbol.for('can.viewModel')] = viewModel;
        }
        function processImport(el, tagData) {
            var moduleName = el.getAttribute('from');
            var templateModule = tagData.scope.get('scope.helpers.module');
            var parentName = templateModule ? templateModule.id : undefined;
            if (!moduleName) {
                return Promise.reject('No module name provided');
            }
            var importPromise = importer(moduleName, parentName);
            importPromise.catch(function (err) {
                canLog.error(err);
            });
            setViewModel(el, importPromise);
            canData.set.call(el, 'scope', importPromise);
            var scope = tagData.scope.add(importPromise, { notContext: true });
            var handOffTag = el.getAttribute('can-tag');
            if (handOffTag) {
                var callback = tag(handOffTag);
                if (!callback || callback === viewCallbacks.defaultCallback) {
                } else {
                    canData.set.call(el, 'preventDataBindings', true);
                    callback(el, assign(tagData, { scope: scope }));
                    canData.set.call(el, 'preventDataBindings', false);
                    setViewModel(el, importPromise);
                    canData.set.call(el, 'scope', importPromise);
                }
            } else {
                var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true, false);
                nodeList.expression = '<' + this.tagName + '>';
                var frag = tagData.subtemplate ? tagData.subtemplate(scope, tagData.options, nodeList) : DOCUMENT().createDocumentFragment();
                var removalDisposal = domMutate.onNodeRemoval(el, function () {
                    if (!el.ownerDocument.contains(el)) {
                        removalDisposal();
                        nodeLists.unregister(nodeList);
                    }
                });
                domMutateNode.appendChild.call(el, frag);
                nodeLists.update(nodeList, getChildNodes(el));
            }
        }
        [
            'can-import',
            'can-dynamic-import'
        ].forEach(function (tagName) {
            tag(tagName, processImport.bind({ tagName: tagName }));
        });
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-bind@1.0.1#can-bind*/
define('can-bind@1.0.1#can-bind', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-symbol',
    'can-namespace',
    'can-queues',
    'can-assign'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var namespace = require('can-namespace');
    var queues = require('can-queues');
    var canAssign = require('can-assign');
    var getChangesSymbol = canSymbol.for('can.getChangesDependencyRecord');
    var getValueSymbol = canSymbol.for('can.getValue');
    var onValueSymbol = canSymbol.for('can.onValue');
    var setValueSymbol = canSymbol.for('can.setValue');
    function defaultSetValue(newValue, observable) {
        canReflect.setValue(observable, newValue);
    }
    function turnOffListeningAndUpdate(listenToObservable, updateObservable, updateFunction, queue) {
        if (listenToObservable[onValueSymbol]) {
            canReflect.offValue(listenToObservable, updateFunction, queue);
        }
    }
    function turnOnListeningAndUpdate(listenToObservable, updateObservable, updateFunction, queue) {
        if (listenToObservable[onValueSymbol]) {
            canReflect.onValue(listenToObservable, updateFunction, queue);
        }
    }
    function Semaphore() {
        this.value = 0;
    }
    canAssign(Semaphore.prototype, {
        decrement: function () {
            this.value -= 1;
        },
        increment: function () {
            this.value += 1;
        }
    });
    function Bind(options) {
        this._options = options;
        if (options.queue === undefined) {
            options.queue = 'domUI';
        }
        if (options.cycles > 0 === false) {
            options.cycles = 0;
        }
        options.onInitDoNotUpdateChild = typeof options.onInitDoNotUpdateChild === 'boolean' ? options.onInitDoNotUpdateChild : false;
        options.onInitSetUndefinedParentIfChildIsDefined = typeof options.onInitSetUndefinedParentIfChildIsDefined === 'boolean' ? options.onInitSetUndefinedParentIfChildIsDefined : true;
        var childSemaphore = new Semaphore();
        var parentSemaphore = new Semaphore();
        var childToParent = true;
        if (typeof options.childToParent === 'boolean') {
            childToParent = options.childToParent;
        } else if (options.child[getValueSymbol] == null) {
            childToParent = false;
        } else if (options.setParent === undefined && options.parent[setValueSymbol] == null) {
            childToParent = false;
        }
        var parentToChild = true;
        if (typeof options.parentToChild === 'boolean') {
            parentToChild = options.parentToChild;
        } else if (options.parent[getValueSymbol] == null) {
            parentToChild = false;
        } else if (options.setChild === undefined && options.child[setValueSymbol] == null) {
            parentToChild = false;
        }
        if (childToParent === false && parentToChild === false) {
            throw new Error('Neither the child nor parent will be updated; this is a no-way binding');
        }
        this._childToParent = childToParent;
        this._parentToChild = parentToChild;
        if (options.setChild === undefined) {
            options.setChild = defaultSetValue;
        }
        if (options.setParent === undefined) {
            options.setParent = defaultSetValue;
        }
        if (options.priority !== undefined) {
            canReflect.setPriority(options.child, options.priority);
            canReflect.setPriority(options.parent, options.priority);
        }
        var allowedUpdates = options.cycles * 2;
        var allowedChildUpdates = allowedUpdates + (options.sticky === 'childSticksToParent' ? 1 : 0);
        var allowedParentUpdates = allowedUpdates + (options.sticky === 'parentSticksToChild' ? 1 : 0);
        var bindingState = this._bindingState = {
            child: false,
            parent: false
        };
        this._updateChild = function (newValue) {
            updateValue({
                bindingState: bindingState,
                newValue: newValue,
                debugObservableName: 'child',
                debugPartnerName: 'parent',
                observable: options.child,
                setValue: options.setChild,
                semaphore: childSemaphore,
                allowedUpdates: allowedChildUpdates,
                sticky: options.sticky === 'parentSticksToChild',
                partner: options.parent,
                setPartner: options.setParent,
                partnerSemaphore: parentSemaphore
            });
        };
        this._updateParent = function (newValue) {
            updateValue({
                bindingState: bindingState,
                newValue: newValue,
                debugObservableName: 'parent',
                debugPartnerName: 'child',
                observable: options.parent,
                setValue: options.setParent,
                semaphore: parentSemaphore,
                allowedUpdates: allowedParentUpdates,
                sticky: options.sticky === 'childSticksToParent',
                partner: options.child,
                setPartner: options.setChild,
                partnerSemaphore: childSemaphore
            });
        };
    }
    Object.defineProperty(Bind.prototype, 'parentValue', {
        get: function () {
            return canReflect.getValue(this._options.parent);
        }
    });
    canAssign(Bind.prototype, {
        start: function () {
            var childValue;
            var options = this._options;
            var parentValue;
            this.startParent();
            this.startChild();
            if (this._childToParent === true && this._parentToChild === true) {
                parentValue = canReflect.getValue(options.parent);
                if (parentValue === undefined) {
                    childValue = canReflect.getValue(options.child);
                    if (childValue === undefined) {
                        if (options.onInitDoNotUpdateChild === false) {
                            this._updateChild(parentValue);
                        }
                    } else if (options.onInitSetUndefinedParentIfChildIsDefined === true) {
                        this._updateParent(childValue);
                    }
                } else {
                    if (options.onInitDoNotUpdateChild === false) {
                        this._updateChild(parentValue);
                    }
                }
            } else if (this._childToParent === true) {
                childValue = canReflect.getValue(options.child);
                this._updateParent(childValue);
            } else if (this._parentToChild === true) {
                if (options.onInitDoNotUpdateChild === false) {
                    parentValue = canReflect.getValue(options.parent);
                    this._updateChild(parentValue);
                }
            }
        },
        startChild: function () {
            if (this._bindingState.child === false && this._childToParent === true) {
                var options = this._options;
                this._bindingState.child = true;
                turnOnListeningAndUpdate(options.child, options.parent, this._updateParent, options.queue);
            }
        },
        startParent: function () {
            if (this._bindingState.parent === false && this._parentToChild === true) {
                var options = this._options;
                this._bindingState.parent = true;
                turnOnListeningAndUpdate(options.parent, options.child, this._updateChild, options.queue);
            }
        },
        stop: function () {
            var bindingState = this._bindingState;
            var options = this._options;
            if (bindingState.parent === true && this._parentToChild === true) {
                bindingState.parent = false;
                turnOffListeningAndUpdate(options.parent, options.child, this._updateChild, options.queue);
            }
            if (bindingState.child === true && this._childToParent === true) {
                bindingState.child = false;
                turnOffListeningAndUpdate(options.child, options.parent, this._updateParent, options.queue);
            }
        }
    });
    function updateValue(args) {
        var bindingState = args.bindingState;
        if (bindingState.child === false && bindingState.parent === false) {
            return;
        }
        var semaphore = args.semaphore;
        if (semaphore.value + args.partnerSemaphore.value <= args.allowedUpdates) {
            queues.batch.start();
            args.setValue(args.newValue, args.observable);
            semaphore.increment();
            queues.mutateQueue.enqueue(semaphore.decrement, semaphore, []);
            queues.batch.stop();
            if (args.sticky) {
                var observableValue = canReflect.getValue(args.observable);
                if (observableValue !== canReflect.getValue(args.partner)) {
                    args.setPartner(observableValue, args.partner);
                }
            }
        } else {
        }
    }
    module.exports = namespace.Bind = Bind;
});
/*can-view-model@4.0.1#can-view-model*/
define('can-view-model@4.0.1#can-view-model', [
    'require',
    'exports',
    'module',
    'can-simple-map',
    'can-namespace',
    'can-globals/document/document',
    'can-reflect',
    'can-symbol'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var SimpleMap = require('can-simple-map');
        var ns = require('can-namespace');
        var getDocument = require('can-globals/document/document');
        var canReflect = require('can-reflect');
        var canSymbol = require('can-symbol');
        var viewModelSymbol = canSymbol.for('can.viewModel');
        module.exports = ns.viewModel = function (el, attr, val) {
            if (typeof el === 'string') {
                el = getDocument().querySelector(el);
            } else if (canReflect.isListLike(el) && !el.nodeType) {
                el = el[0];
            }
            if (canReflect.isObservableLike(attr) && canReflect.isMapLike(attr)) {
                el[viewModelSymbol] = attr;
                return;
            }
            var scope = el[viewModelSymbol];
            if (!scope) {
                scope = new SimpleMap();
                el[viewModelSymbol] = scope;
            }
            switch (arguments.length) {
            case 0:
            case 1:
                return scope;
            case 2:
                return canReflect.getKeyValue(scope, attr);
            default:
                canReflect.setKeyValue(scope, attr, val);
                return el;
            }
        };
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-attribute-observable@1.1.5#event*/
define('can-attribute-observable@1.1.5#event', [
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-dom-events',
    'can-dom-events/helpers/util'
], function (require, exports, module) {
    'use strict';
    var canReflect = require('can-reflect');
    var domEvents = require('can-dom-events');
    var isDomEventTarget = require('can-dom-events/helpers/util').isDomEventTarget;
    var canEvent = {
        on: function on(eventName, handler, queue) {
            if (isDomEventTarget(this)) {
                domEvents.addEventListener(this, eventName, handler, queue);
            } else {
                canReflect.onKeyValue(this, eventName, handler, queue);
            }
        },
        off: function off(eventName, handler, queue) {
            if (isDomEventTarget(this)) {
                domEvents.removeEventListener(this, eventName, handler, queue);
            } else {
                canReflect.offKeyValue(this, eventName, handler, queue);
            }
        },
        one: function one(event, handler, queue) {
            var one = function () {
                canEvent.off.call(this, event, one, queue);
                return handler.apply(this, arguments);
            };
            canEvent.on.call(this, event, one, queue);
            return this;
        }
    };
    module.exports = canEvent;
});
/*can-attribute-observable@1.1.5#get-event-name*/
define('can-attribute-observable@1.1.5#get-event-name', [
    'require',
    'exports',
    'module',
    './behaviors'
], function (require, exports, module) {
    'use strict';
    var attr = require('./behaviors');
    var isRadioInput = function isRadioInput(el) {
        return el.nodeName.toLowerCase() === 'input' && el.type === 'radio';
    };
    var isValidProp = function isValidProp(prop, bindingData) {
        return prop === 'checked' && !bindingData.legacyBindings;
    };
    module.exports = function getEventName(el, prop, bindingData) {
        var event = 'change';
        if (isRadioInput(el) && isValidProp(prop, bindingData)) {
            event = 'can-attribute-observable-radiochange';
        }
        if (attr.findSpecialListener(prop)) {
            event = prop;
        }
        return event;
    };
});
/*can-event-dom-radiochange@2.2.0#can-event-dom-radiochange*/
define('can-event-dom-radiochange@2.2.0#can-event-dom-radiochange', [
    'require',
    'exports',
    'module',
    'can-globals/document/document',
    'can-namespace'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var getDocument = require('can-globals/document/document');
        var namespace = require('can-namespace');
        function getRoot() {
            return getDocument().documentElement;
        }
        function findParentForm(el) {
            while (el) {
                if (el.nodeName === 'FORM') {
                    break;
                }
                el = el.parentNode;
            }
            return el;
        }
        function shouldReceiveEventFromRadio(source, dest) {
            var name = source.getAttribute('name');
            return name && name === dest.getAttribute('name') && findParentForm(source) === findParentForm(dest);
        }
        function isRadioInput(el) {
            return el.nodeName === 'INPUT' && el.type === 'radio';
        }
        function attachRootListener(domEvents, eventTypeTargets) {
            var root = getRoot();
            var newListener = function (event) {
                var target = event.target;
                if (!isRadioInput(target)) {
                    return;
                }
                for (var eventType in eventTypeTargets) {
                    var newEvent = { type: eventType };
                    var listeningNodes = eventTypeTargets[eventType];
                    listeningNodes.forEach(function (el) {
                        if (shouldReceiveEventFromRadio(target, el)) {
                            domEvents.dispatch(el, newEvent, false);
                        }
                    });
                }
            };
            domEvents.addEventListener(root, 'change', newListener);
            return newListener;
        }
        function detachRootListener(domEvents, listener) {
            var root = getRoot();
            domEvents.removeEventListener(root, 'change', listener);
        }
        var radioChangeEvent = {
            defaultEventType: 'radiochange',
            addEventListener: function (target, eventType, handler) {
                if (!isRadioInput(target)) {
                    throw new Error('Listeners for ' + eventType + ' must be radio inputs');
                }
                var eventTypeTrackedRadios = radioChangeEvent._eventTypeTrackedRadios;
                if (!eventTypeTrackedRadios) {
                    eventTypeTrackedRadios = radioChangeEvent._eventTypeTrackedRadios = {};
                    if (!radioChangeEvent._rootListener) {
                        radioChangeEvent._rootListener = attachRootListener(this, eventTypeTrackedRadios);
                    }
                }
                var trackedRadios = radioChangeEvent._eventTypeTrackedRadios[eventType];
                if (!trackedRadios) {
                    trackedRadios = radioChangeEvent._eventTypeTrackedRadios[eventType] = new Set();
                }
                trackedRadios.add(target);
                target.addEventListener(eventType, handler);
            },
            removeEventListener: function (target, eventType, handler) {
                target.removeEventListener(eventType, handler);
                var eventTypeTrackedRadios = radioChangeEvent._eventTypeTrackedRadios;
                if (!eventTypeTrackedRadios) {
                    return;
                }
                var trackedRadios = eventTypeTrackedRadios[eventType];
                if (!trackedRadios) {
                    return;
                }
                trackedRadios.delete(target);
                if (trackedRadios.size === 0) {
                    delete eventTypeTrackedRadios[eventType];
                    for (var key in eventTypeTrackedRadios) {
                        if (eventTypeTrackedRadios.hasOwnProperty(key)) {
                            return;
                        }
                    }
                    delete radioChangeEvent._eventTypeTrackedRadios;
                    detachRootListener(this, radioChangeEvent._rootListener);
                    delete radioChangeEvent._rootListener;
                }
            }
        };
        module.exports = namespace.domEventRadioChange = radioChangeEvent;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-attribute-observable@1.1.5#can-attribute-observable*/
define('can-attribute-observable@1.1.5#can-attribute-observable', [
    'require',
    'exports',
    'module',
    'can-queues',
    './event',
    'can-reflect',
    'can-observation',
    './behaviors',
    './get-event-name',
    'can-reflect-dependencies',
    'can-observation-recorder',
    'can-simple-observable/settable/settable',
    'can-dom-events',
    'can-event-dom-radiochange'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'use strict';
        var queues = require('can-queues');
        var canEvent = require('./event');
        var canReflect = require('can-reflect');
        var Observation = require('can-observation');
        var attr = require('./behaviors');
        var getEventName = require('./get-event-name');
        var canReflectDeps = require('can-reflect-dependencies');
        var ObservationRecorder = require('can-observation-recorder');
        var SettableObservable = require('can-simple-observable/settable/settable');
        var domEvents = require('can-dom-events');
        var radioChangeEvent = require('can-event-dom-radiochange');
        var internalRadioChangeEventType = 'can-attribute-observable-radiochange';
        domEvents.addEvent(radioChangeEvent, internalRadioChangeEventType);
        var isSelect = function isSelect(el) {
            return el.nodeName.toLowerCase() === 'select';
        };
        var isMultipleSelect = function isMultipleSelect(el, prop) {
            return isSelect(el) && prop === 'value' && el.multiple;
        };
        var slice = Array.prototype.slice;
        function canUtilAEL() {
            var args = slice.call(arguments, 0);
            args.unshift(this);
            return domEvents.addEventListener.apply(null, args);
        }
        function canUtilREL() {
            var args = slice.call(arguments, 0);
            args.unshift(this);
            return domEvents.removeEventListener.apply(null, args);
        }
        function AttributeObservable(el, prop, bindingData, event) {
            this.el = el;
            this.bound = false;
            this.bindingData = bindingData;
            this.prop = isMultipleSelect(el, prop) ? 'values' : prop;
            this.event = event || getEventName(el, prop, bindingData);
            this.handler = this.handler.bind(this);
        }
        AttributeObservable.prototype = Object.create(SettableObservable.prototype);
        Object.assign(AttributeObservable.prototype, {
            constructor: AttributeObservable,
            get: function get() {
                if (ObservationRecorder.isRecording()) {
                    ObservationRecorder.add(this);
                    if (!this.bound) {
                        Observation.temporarilyBind(this);
                    }
                }
                var value = attr.get(this.el, this.prop);
                if (typeof value === 'function') {
                    value = value.bind(this.el);
                }
                return value;
            },
            set: function set(newVal) {
                var setterDispatchedEvents = attr.setAttrOrProp(this.el, this.prop, newVal);
                if (!setterDispatchedEvents) {
                    this._value = newVal;
                }
                return newVal;
            },
            handler: function handler(newVal, event) {
                var old = this._value;
                var queuesArgs = [];
                this._value = attr.get(this.el, this.prop);
                if (this._value !== old) {
                    queuesArgs = [
                        this.handlers.getNode([]),
                        this,
                        [
                            newVal,
                            old
                        ]
                    ];
                    queues.enqueueByQueue.apply(queues, queuesArgs);
                }
            },
            onBound: function onBound() {
                var observable = this;
                observable.bound = true;
                observable._handler = function (event) {
                    observable.handler(attr.get(observable.el, observable.prop), event);
                };
                if (observable.event === internalRadioChangeEventType) {
                    canEvent.on.call(observable.el, 'change', observable._handler);
                }
                var specialBinding = attr.findSpecialListener(observable.prop);
                if (specialBinding) {
                    observable._specialDisposal = specialBinding.call(observable.el, observable.prop, observable._handler, canUtilAEL);
                }
                canEvent.on.call(observable.el, observable.event, observable._handler);
                this._value = attr.get(this.el, this.prop);
            },
            onUnbound: function onUnbound() {
                var observable = this;
                observable.bound = false;
                if (observable.event === internalRadioChangeEventType) {
                    canEvent.off.call(observable.el, 'change', observable._handler);
                }
                if (observable._specialDisposal) {
                    observable._specialDisposal.call(observable.el, canUtilREL);
                    observable._specialDisposal = null;
                }
                canEvent.off.call(observable.el, observable.event, observable._handler);
            },
            valueHasDependencies: function valueHasDependencies() {
                return true;
            },
            getValueDependencies: function getValueDependencies() {
                var m = new Map();
                var s = new Set();
                s.add(this.prop);
                m.set(this.el, s);
                return { keyDependencies: m };
            }
        });
        canReflect.assignSymbols(AttributeObservable.prototype, {
            'can.isMapLike': false,
            'can.getValue': AttributeObservable.prototype.get,
            'can.setValue': AttributeObservable.prototype.set,
            'can.onValue': AttributeObservable.prototype.on,
            'can.offValue': AttributeObservable.prototype.off,
            'can.valueHasDependencies': AttributeObservable.prototype.hasDependencies,
            'can.getValueDependencies': AttributeObservable.prototype.getValueDependencies
        });
        module.exports = AttributeObservable;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*can-stache-bindings@4.5.0#can-stache-bindings*/
define('can-stache-bindings@4.5.0#can-stache-bindings', [
    'require',
    'exports',
    'module',
    'can-bind',
    'can-stache/src/expression',
    'can-view-callbacks',
    'can-view-model',
    'can-stache-key',
    'can-observation-recorder',
    'can-simple-observable',
    'can-assign',
    'can-log/dev/dev',
    'can-dom-mutate',
    'can-dom-data-state',
    'can-symbol',
    'can-reflect',
    'can-reflect-dependencies',
    'can-attribute-encoder',
    'can-queues',
    'can-simple-observable/setter/setter',
    'can-attribute-observable',
    'can-view-scope/make-compute-like',
    'can-view-nodelist',
    'can-attribute-observable/event'
], function (require, exports, module) {
    'use strict';
    var Bind = require('can-bind');
    var expression = require('can-stache/src/expression');
    var viewCallbacks = require('can-view-callbacks');
    var canViewModel = require('can-view-model');
    var observeReader = require('can-stache-key');
    var ObservationRecorder = require('can-observation-recorder');
    var SimpleObservable = require('can-simple-observable');
    var assign = require('can-assign');
    var dev = require('can-log/dev/dev');
    var domMutate = require('can-dom-mutate');
    var domData = require('can-dom-data-state');
    var canSymbol = require('can-symbol');
    var canReflect = require('can-reflect');
    var canReflectDeps = require('can-reflect-dependencies');
    var encoder = require('can-attribute-encoder');
    var queues = require('can-queues');
    var SettableObservable = require('can-simple-observable/setter/setter');
    var AttributeObservable = require('can-attribute-observable');
    var makeCompute = require('can-view-scope/make-compute-like');
    var ViewNodeList = require('can-view-nodelist');
    var canEvent = require('can-attribute-observable/event');
    var bindings = new Map();
    var onMatchStr = 'on:', vmMatchStr = 'vm:', elMatchStr = 'el:', byMatchStr = ':by:', toMatchStr = ':to', fromMatchStr = ':from', bindMatchStr = ':bind', viewModelBindingStr = 'viewModel', attributeBindingStr = 'attribute', scopeBindingStr = 'scope', viewModelOrAttributeBindingStr = 'viewModelOrAttribute';
    var throwOnlyOneTypeOfBindingError = function () {
        throw new Error('can-stache-bindings - you can not have contextual bindings ( this:from=\'value\' ) and key bindings ( prop:from=\'value\' ) on one element.');
    };
    var checkBindingState = function (bindingState, bindingInfo) {
        var isSettingOnViewModel = bindingInfo.parentToChild && bindingInfo.child === viewModelBindingStr;
        if (isSettingOnViewModel) {
            var bindingName = bindingInfo.childName;
            var isSettingViewModel = isSettingOnViewModel && (bindingName === 'this' || bindingName === '.');
            if (isSettingViewModel) {
                if (bindingState.isSettingViewModel || bindingState.isSettingOnViewModel) {
                    throwOnlyOneTypeOfBindingError();
                } else {
                    return {
                        isSettingViewModel: true,
                        initialViewModelData: undefined
                    };
                }
            } else {
                if (bindingState.isSettingViewModel) {
                    throwOnlyOneTypeOfBindingError();
                } else {
                    return {
                        isSettingOnViewModel: true,
                        initialViewModelData: bindingState.initialViewModelData
                    };
                }
            }
        } else {
            return bindingState;
        }
    };
    var makeScopeFromEvent = function (element, event, viewModel, args, data) {
        var specialValues = {
            element: element,
            event: event,
            viewModel: viewModel,
            arguments: args
        };
        return data.scope.add(specialValues, { special: true });
    };
    var runEventCallback = function (el, ev, data, scope, expr, attributeName, attrVal) {
        var updateFn = function () {
            var value = expr.value(scope, { doNotWrapInObservation: true });
            value = canReflect.isValueLike(value) ? canReflect.getValue(value) : value;
            return typeof value === 'function' ? value(el) : value;
        };
        queues.batch.start();
        var mutateQueueArgs = [];
        mutateQueueArgs = [
            updateFn,
            null,
            null,
            {}
        ];
        queues.mutateQueue.enqueue.apply(queues.mutateQueue, mutateQueueArgs);
        queues.batch.stop();
    };
    var behaviors = {
        viewModel: function (el, tagData, makeViewModel, initialViewModelData, staticDataBindingsOnly) {
            var viewModel, onCompleteBindings = [], onTeardowns = {}, bindingInfos = {}, attributeViewModelBindings = assign({}, initialViewModelData), bindingsState = {
                    isSettingOnViewModel: false,
                    isSettingViewModel: false,
                    initialViewModelData: initialViewModelData || {}
                }, hasDataBinding = false;
            canReflect.each(el.attributes || [], function (node) {
                var dataBinding = makeDataBinding(node, el, {
                    templateType: tagData.templateType,
                    scope: tagData.scope,
                    getViewModel: function () {
                        return viewModel;
                    },
                    attributeViewModelBindings: attributeViewModelBindings,
                    alreadyUpdatedChild: true,
                    nodeList: tagData.parentNodeList,
                    favorViewModel: true
                });
                if (dataBinding) {
                    var bindingInfo = dataBinding.bindingInfo;
                    bindingsState = checkBindingState(bindingsState, bindingInfo);
                    hasDataBinding = true;
                    if (bindingInfo.parentToChild) {
                        var parentValue = bindingInfo.stickyParentToChild ? makeCompute(dataBinding.parent) : dataBinding.canBinding.parentValue;
                        if (parentValue !== undefined) {
                            if (bindingsState.isSettingViewModel) {
                                bindingsState.initialViewModelData = parentValue;
                            } else {
                                bindingsState.initialViewModelData[cleanVMName(bindingInfo.childName, tagData.scope)] = parentValue;
                            }
                        }
                    }
                    onCompleteBindings.push(dataBinding.canBinding.start.bind(dataBinding.canBinding));
                    onTeardowns[node.name] = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
                }
            });
            if (staticDataBindingsOnly && !hasDataBinding) {
                return;
            }
            viewModel = makeViewModel(bindingsState.initialViewModelData, hasDataBinding, bindingsState);
            for (var i = 0, len = onCompleteBindings.length; i < len; i++) {
                onCompleteBindings[i]();
            }
            var attributeDisposal;
            if (!bindingsState.isSettingViewModel) {
                attributeDisposal = domMutate.onNodeAttributeChange(el, function (ev) {
                    var attrName = ev.attributeName, value = el.getAttribute(attrName);
                    if (onTeardowns[attrName]) {
                        onTeardowns[attrName]();
                    }
                    var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === attributeBindingStr;
                    if (value !== null || parentBindingWasAttribute) {
                        var dataBinding = makeDataBinding({
                            name: attrName,
                            value: value
                        }, el, {
                            templateType: tagData.templateType,
                            scope: tagData.scope,
                            getViewModel: function () {
                                return viewModel;
                            },
                            attributeViewModelBindings: attributeViewModelBindings,
                            initializeValues: true,
                            nodeList: tagData.parentNodeList
                        });
                        if (dataBinding) {
                            dataBinding.canBinding.start();
                            bindingInfos[attrName] = dataBinding.bindingInfo;
                            onTeardowns[attrName] = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
                        }
                    }
                });
            }
            return function () {
                if (attributeDisposal) {
                    attributeDisposal();
                    attributeDisposal = undefined;
                }
                for (var attrName in onTeardowns) {
                    onTeardowns[attrName]();
                }
            };
        },
        data: function (el, attrData) {
            if (domData.get.call(el, 'preventDataBindings')) {
                return;
            }
            var viewModel, getViewModel = ObservationRecorder.ignore(function () {
                    return viewModel || (viewModel = canViewModel(el));
                }), teardown, attributeDisposal, removedDisposal;
            var dataBinding = makeDataBinding({
                name: attrData.attributeName,
                value: el.getAttribute(attrData.attributeName),
                nodeList: attrData.nodeList
            }, el, {
                templateType: attrData.templateType,
                scope: attrData.scope,
                getViewModel: getViewModel,
                syncChildWithParent: false
            });
            dataBinding.canBinding.start();
            var attributeListener = function (ev) {
                var attrName = ev.attributeName, value = el.getAttribute(attrName);
                if (attrName === attrData.attributeName) {
                    if (teardown) {
                        teardown();
                    }
                    if (value !== null) {
                        var dataBinding = makeDataBinding({
                            name: attrName,
                            value: value
                        }, el, {
                            templateType: attrData.templateType,
                            scope: attrData.scope,
                            getViewModel: getViewModel,
                            initializeValues: true,
                            nodeList: attrData.nodeList,
                            syncChildWithParent: false
                        });
                        if (dataBinding) {
                            dataBinding.canBinding.start();
                            teardown = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
                        }
                        teardown = dataBinding.onTeardown;
                    }
                }
            };
            var tearItAllDown = function () {
                if (teardown) {
                    teardown();
                    teardown = undefined;
                }
                if (removedDisposal) {
                    removedDisposal();
                    removedDisposal = undefined;
                }
                if (attributeDisposal) {
                    attributeDisposal();
                    attributeDisposal = undefined;
                }
            };
            if (attrData.nodeList) {
                ViewNodeList.register([], tearItAllDown, attrData.nodeList, false);
            }
            teardown = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
            attributeDisposal = domMutate.onNodeAttributeChange(el, attributeListener);
            removedDisposal = domMutate.onNodeRemoval(el, function () {
                var doc = el.ownerDocument;
                var ownerNode = doc.contains ? doc : doc.documentElement;
                if (ownerNode.contains(el) === false) {
                    tearItAllDown();
                }
            });
        },
        event: function (el, data) {
            var attributeName = encoder.decode(data.attributeName), event, bindingContext;
            if (attributeName.indexOf(toMatchStr + ':') !== -1 || attributeName.indexOf(fromMatchStr + ':') !== -1 || attributeName.indexOf(bindMatchStr + ':') !== -1) {
                return this.data(el, data);
            }
            if (startsWith.call(attributeName, onMatchStr)) {
                event = attributeName.substr(onMatchStr.length);
                var viewModel = el[canSymbol.for('can.viewModel')];
                var byParent = data.scope;
                if (startsWith.call(event, elMatchStr)) {
                    event = event.substr(elMatchStr.length);
                    bindingContext = el;
                } else {
                    if (startsWith.call(event, vmMatchStr)) {
                        event = event.substr(vmMatchStr.length);
                        bindingContext = viewModel;
                        byParent = viewModel;
                    } else {
                        bindingContext = viewModel || el;
                    }
                    var byIndex = event.indexOf(byMatchStr);
                    if (byIndex >= 0) {
                        bindingContext = byParent.get(event.substr(byIndex + byMatchStr.length));
                        event = event.substr(0, byIndex);
                    }
                }
            } else {
                throw new Error('can-stache-bindings - unsupported event bindings ' + attributeName);
            }
            var handler = function (ev) {
                var attrVal = el.getAttribute(encoder.encode(attributeName));
                if (!attrVal) {
                    return;
                }
                var viewModel = canViewModel(el);
                var expr = expression.parse(attrVal, {
                    lookupRule: function () {
                        return expression.Lookup;
                    },
                    methodRule: 'call'
                });
                var runScope = makeScopeFromEvent(el, ev, viewModel, arguments, data);
                if (expr instanceof expression.Hashes) {
                    var hashExprs = expr.hashExprs;
                    var key = Object.keys(hashExprs)[0];
                    var value = expr.hashExprs[key].value(runScope);
                    var isObservableValue = canReflect.isObservableLike(value) && canReflect.isValueLike(value);
                    runScope.set(key, isObservableValue ? canReflect.getValue(value) : value);
                } else if (expr instanceof expression.Call) {
                    runEventCallback(el, ev, data, runScope, expr, attributeName, attrVal);
                } else {
                    throw new Error('can-stache-bindings: Event bindings must be a call expression. Make sure you have a () in ' + data.attributeName + '=' + JSON.stringify(attrVal));
                }
            };
            var attributesDisposal, removalDisposal;
            var attributesHandler = function (ev) {
                var isEventAttribute = ev.attributeName === attributeName;
                var isRemoved = !el.getAttribute(attributeName);
                var isEventAttributeRemoved = isEventAttribute && isRemoved;
                if (isEventAttributeRemoved) {
                    unbindEvent();
                }
            };
            var removalHandler = function () {
                var doc = el.ownerDocument;
                var ownerNode = doc.contains ? doc : doc.documentElement;
                if (!ownerNode.contains(el)) {
                    unbindEvent();
                }
            };
            var unbindEvent = function () {
                canEvent.off.call(bindingContext, event, handler);
                if (attributesDisposal) {
                    attributesDisposal();
                    attributesDisposal = undefined;
                }
                if (removalDisposal) {
                    removalDisposal();
                    removalDisposal = undefined;
                }
            };
            canEvent.on.call(bindingContext, event, handler);
            attributesDisposal = domMutate.onNodeAttributeChange(el, attributesHandler);
            removalDisposal = domMutate.onNodeRemoval(el, removalHandler);
        }
    };
    bindings.set(/[\w\.:]+:to$/, behaviors.data);
    bindings.set(/[\w\.:]+:from$/, behaviors.data);
    bindings.set(/[\w\.:]+:bind$/, behaviors.data);
    bindings.set(/[\w\.:]+:raw$/, behaviors.data);
    bindings.set(/[\w\.:]+:to:on:[\w\.:]+/, behaviors.data);
    bindings.set(/[\w\.:]+:from:on:[\w\.:]+/, behaviors.data);
    bindings.set(/[\w\.:]+:bind:on:[\w\.:]+/, behaviors.data);
    bindings.set(/on:[\w\.:]+/, behaviors.event);
    var getObservableFrom = {
        viewModelOrAttribute: function (el, scope, vmNameOrProp, bindingData, mustBeGettable, stickyCompute, event) {
            var viewModel = el[canSymbol.for('can.viewModel')];
            if (viewModel) {
                return this.viewModel.apply(this, arguments);
            } else {
                return this.attribute.apply(this, arguments);
            }
        },
        scope: function (el, scope, scopeProp, bindingData, mustBeGettable, stickyCompute) {
            if (!scopeProp) {
                return new SimpleObservable();
            } else {
                if (mustBeGettable || scopeProp.indexOf('(') >= 0) {
                    var parentExpression = expression.parse(scopeProp, { baseMethodType: 'Call' });
                    return parentExpression.value(scope);
                } else {
                    var observation = {};
                    canReflect.assignSymbols(observation, {
                        'can.getValue': function getValue() {
                        },
                        'can.valueHasDependencies': function hasValueDependencies() {
                            return false;
                        },
                        'can.setValue': function setValue(newVal) {
                            scope.set(cleanVMName(scopeProp, scope), newVal);
                        },
                        'can.getWhatIChange': function getWhatIChange() {
                            var data = scope.getDataForScopeSet(cleanVMName(scopeProp, scope));
                            var m = new Map();
                            var s = new Set();
                            s.add(data.key);
                            m.set(data.parent, s);
                            return { mutate: { keyDependencies: m } };
                        },
                        'can.getName': function getName() {
                        }
                    });
                    var data = scope.getDataForScopeSet(cleanVMName(scopeProp, scope));
                    if (data.parent && data.key) {
                        canReflectDeps.addMutatedBy(data.parent, data.key, observation);
                    }
                    return observation;
                }
            }
        },
        viewModel: function (el, scope, vmName, bindingData, mustBeGettable, stickyCompute, childEvent) {
            var setName = cleanVMName(vmName, scope);
            var isBoundToContext = vmName === '.' || vmName === 'this';
            var keysToRead = isBoundToContext ? [] : observeReader.reads(vmName);
            function getViewModelProperty() {
                var viewModel = bindingData.getViewModel();
                return observeReader.read(viewModel, keysToRead, {}).value;
            }
            var observation = new SettableObservable(getViewModelProperty, function setViewModelProperty(newVal) {
                var viewModel = bindingData.getViewModel();
                if (stickyCompute) {
                    var oldValue = canReflect.getKeyValue(viewModel, setName);
                    if (canReflect.isObservableLike(oldValue)) {
                        canReflect.setValue(oldValue, newVal);
                    } else {
                        canReflect.setKeyValue(viewModel, setName, new SimpleObservable(canReflect.getValue(stickyCompute)));
                    }
                } else {
                    if (isBoundToContext) {
                        canReflect.setValue(viewModel, newVal);
                    } else {
                        canReflect.setKeyValue(viewModel, setName, newVal);
                    }
                }
            });
            return observation;
        },
        attribute: function (el, scope, prop, bindingData, mustBeGettable, stickyCompute, event, bindingInfo) {
            return new AttributeObservable(el, prop, bindingData, event);
        }
    };
    var startsWith = String.prototype.startsWith || function (text) {
        return this.indexOf(text) === 0;
    };
    function getEventName(result) {
        if (result.special.on !== undefined) {
            return result.tokens[result.special.on + 1];
        }
    }
    var bindingRules = {
        to: {
            childToParent: true,
            parentToChild: false,
            syncChildWithParent: false
        },
        from: {
            childToParent: false,
            parentToChild: true,
            syncChildWithParent: false
        },
        bind: {
            childToParent: true,
            parentToChild: true,
            syncChildWithParent: true
        },
        raw: {
            childToParent: false,
            parentToChild: true,
            syncChildWithParent: false
        }
    };
    var bindingNames = [];
    var special = {
        vm: true,
        on: true
    };
    canReflect.each(bindingRules, function (value, key) {
        bindingNames.push(key);
        special[key] = true;
    });
    function tokenize(source) {
        var splitByColon = source.split(':');
        var result = {
            tokens: [],
            special: {}
        };
        splitByColon.forEach(function (token) {
            if (special[token]) {
                result.special[token] = result.tokens.push(token) - 1;
            } else {
                result.tokens.push(token);
            }
        });
        return result;
    }
    var getChildBindingStr = function (tokens, favorViewModel) {
        if (tokens.indexOf('vm') >= 0) {
            return viewModelBindingStr;
        } else if (tokens.indexOf('el') >= 0) {
            return attributeBindingStr;
        } else {
            return favorViewModel ? viewModelBindingStr : viewModelOrAttributeBindingStr;
        }
    };
    var getBindingInfo = function (node, attributeViewModelBindings, templateType, tagName, favorViewModel) {
        var bindingInfo, attributeName = encoder.decode(node.name), attributeValue = node.value || '';
        var result = tokenize(attributeName), dataBindingName, specialIndex;
        bindingNames.forEach(function (name) {
            if (result.special[name] !== undefined && result.special[name] > 0) {
                dataBindingName = name;
                specialIndex = result.special[name];
                return false;
            }
        });
        if (dataBindingName) {
            var childEventName = getEventName(result);
            var initializeValues = childEventName && dataBindingName !== 'bind' ? false : true;
            bindingInfo = assign({
                parent: scopeBindingStr,
                child: getChildBindingStr(result.tokens, favorViewModel),
                childName: result.tokens[specialIndex - 1],
                childEvent: childEventName,
                bindingAttributeName: attributeName,
                parentName: result.special.raw ? '"' + attributeValue + '"' : attributeValue,
                initializeValues: initializeValues
            }, bindingRules[dataBindingName]);
            if (attributeValue.trim().charAt(0) === '~') {
                bindingInfo.stickyParentToChild = true;
            }
            return bindingInfo;
        }
    };
    var makeDataBinding = function (node, el, bindingData) {
        var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings, bindingData.templateType, el.nodeName.toLowerCase(), bindingData.favorViewModel);
        if (!bindingInfo) {
            return;
        }
        var parentObservable = getObservableFrom[bindingInfo.parent](el, bindingData.scope, bindingInfo.parentName, bindingData, bindingInfo.parentToChild, undefined, undefined, bindingInfo), childObservable = getObservableFrom[bindingInfo.child](el, bindingData.scope, bindingInfo.childName, bindingData, bindingInfo.childToParent, bindingInfo.stickyParentToChild && parentObservable, bindingInfo.childEvent, bindingInfo);
        var childToParent = !!bindingInfo.childToParent;
        var parentToChild = !!bindingInfo.parentToChild;
        var bindingOptions = {
            child: childObservable,
            childToParent: childToParent,
            cycles: 0,
            onInitDoNotUpdateChild: bindingData.alreadyUpdatedChild,
            onInitSetUndefinedParentIfChildIsDefined: true,
            parent: parentObservable,
            parentToChild: parentToChild,
            priority: bindingData.nodeList ? bindingData.nodeList.nesting + 1 : undefined,
            queue: 'domUI',
            sticky: bindingInfo.syncChildWithParent ? 'childSticksToParent' : undefined
        };
        var canBinding = new Bind(bindingOptions);
        canBinding.startParent();
        return {
            bindingInfo: bindingInfo,
            canBinding: canBinding,
            parent: parentObservable
        };
    };
    var cleanVMName = function (name, scope) {
        return name.replace(/@/g, '');
    };
    var canStacheBindings = {
        behaviors: behaviors,
        getBindingInfo: getBindingInfo,
        bindings: bindings
    };
    canStacheBindings[canSymbol.for('can.callbackMap')] = bindings;
    viewCallbacks.attrs(canStacheBindings);
    module.exports = canStacheBindings;
});
/*steal-stache@4.1.2#add-bundles*/
define('steal-stache@4.1.2#add-bundles', [], function(){ return {}; });
/*steal-config-utils@1.0.0#import-specifiers*/
define('steal-config-utils@1.0.0#import-specifiers', [], function(){ return {}; });
/*steal-stache@4.1.2#steal-stache*/
define('steal-stache@4.1.2#steal-stache', [], function(){ return {}; });
/*authentication@1.0.0#html/base.stache!steal-stache@4.1.2#steal-stache*/
define('authentication@1.0.0#html/base.stache!steal-stache@4.1.2#steal-stache', [
    'module',
    'can-stache',
    'can-stache/src/mustache_core',
    'can-view-import@4.2.0#can-view-import',
    'can-stache-bindings@4.5.0#can-stache-bindings'
], function (module, stache, mustacheCore) {
    var renderer = stache('html/base.stache', [
        {
            'tokenType': 'start',
            'args': [
                'div',
                false,
                1
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'class',
                1
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'container-left',
                1
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'class',
                1
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false,
                1
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'div',
                1
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n',
                1
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false,
                3
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'class',
                3
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'container-right auth-container-left',
                3
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'class',
                3
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false,
                3
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n    ',
                3
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false,
                5
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'class',
                5
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'form authentication-form',
                5
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'class',
                5
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false,
                5
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                5
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'label',
                false,
                7
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'for',
                7
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'username',
                7
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'for',
                7
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'label',
                false,
                7
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                'Gebruikersnaam:',
                7
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'label',
                7
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n        ',
                7
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'input',
                true,
                8
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'type',
                8
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'text',
                8
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'type',
                8
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'id',
                8
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'username',
                8
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'id',
                8
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'input',
                true,
                8
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                8
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'label',
                false,
                10
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'for',
                10
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'password',
                10
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'for',
                10
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'label',
                false,
                10
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                'Wachtwoord:',
                10
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'label',
                10
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n        ',
                10
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'input',
                true,
                11
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'type',
                11
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'password',
                11
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'type',
                11
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'id',
                11
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'password',
                11
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'id',
                11
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'input',
                true,
                11
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                11
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'button',
                false,
                13
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'id',
                13
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'login',
                13
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'id',
                13
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'class',
                13
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'btn btn-login',
                13
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'class',
                13
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'button',
                false,
                13
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                'Aanmelden!',
                13
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'button',
                13
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                13
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'div',
                false,
                15
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'class',
                15
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                'bottom',
                15
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'class',
                15
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'div',
                false,
                15
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                15
            ]
        },
        {
            'tokenType': 'start',
            'args': [
                'a',
                false,
                17
            ]
        },
        {
            'tokenType': 'attrStart',
            'args': [
                'href',
                17
            ]
        },
        {
            'tokenType': 'attrValue',
            'args': [
                '/password/forgot',
                17
            ]
        },
        {
            'tokenType': 'attrEnd',
            'args': [
                'href',
                17
            ]
        },
        {
            'tokenType': 'end',
            'args': [
                'a',
                false,
                17
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                'Wachtwoord vergeten?',
                17
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'a',
                17
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n        ',
                17
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'div',
                19
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n    ',
                19
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'div',
                21
            ]
        },
        {
            'tokenType': 'chars',
            'args': [
                '\r\n\r\n',
                21
            ]
        },
        {
            'tokenType': 'close',
            'args': [
                'div',
                23
            ]
        },
        {
            'tokenType': 'done',
            'args': [23]
        }
    ]);
    return function (scope, options, nodeList) {
        var moduleOptions = Object.assign({}, options);
        if (moduleOptions.helpers) {
            moduleOptions.helpers = Object.assign({ module: module }, moduleOptions.helpers);
        } else {
            moduleOptions.module = module;
        }
        return renderer(scope, moduleOptions, nodeList);
    };
});
/*steal-css@1.3.2#css*/
define('steal-css@1.3.2#css', [
    'require',
    'exports',
    'module',
    '@loader',
    '@steal'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        var loader = require('@loader');
        var steal = require('@steal');
        var isNode = typeof process === 'object' && {}.toString.call(process) === '[object process]';
        var importRegEx = /@import [^uU]['"]?([^'"\)]*)['"]?/g;
        var resourceRegEx = /url\(['"]?([^'"\)]*)['"]?\)/g;
        var waitSeconds = loader.cssOptions && loader.cssOptions.timeout ? parseInt(loader.cssOptions.timeout, 10) : 60;
        var onloadCss = function (link, cb) {
            var styleSheets = getDocument().styleSheets, i = styleSheets.length;
            while (i--) {
                if (styleSheets[i].href === link.href) {
                    return cb();
                }
            }
            setTimeout(function () {
                onloadCss(link, cb);
            });
        };
        function isIE9() {
            var doc = getDocument();
            return doc && !!Function('/*@cc_on return (/^9/.test(@_jscript_version) && /MSIE 9.0(?!.*IEMobile)/i.test(navigator.userAgent)); @*/')();
        }
        function getDocument() {
            if (typeof doneSsr !== 'undefined' && doneSsr.globalDocument) {
                return doneSsr.globalDocument;
            }
            if (typeof document !== 'undefined') {
                return document;
            }
            throw new Error('Unable to load CSS in an environment without a document.');
        }
        function getHead() {
            var doc = getDocument();
            var head = doc.head || doc.getElementsByTagName('head')[0];
            if (!head) {
                var docEl = doc.documentElement || doc;
                head = doc.createElement('head');
                docEl.insertBefore(head, docEl.firstChild);
            }
            return head;
        }
        function CSSModule(load, loader) {
            if (typeof load === 'object') {
                this.load = load;
                this.loader = loader;
                this.address = this.load.address;
                this.source = this.load.source;
            } else {
                this.address = load;
                this.source = loader;
            }
        }
        CSSModule.cssCount = 0;
        CSSModule.ie9MaxStyleSheets = 31;
        CSSModule.currentStyleSheet = null;
        CSSModule.prototype = {
            injectLink: function () {
                if (this._loaded) {
                    return this._loaded;
                }
                if (this.linkExists()) {
                    this._loaded = Promise.resolve('');
                    return this._loaded;
                }
                var doc = getDocument();
                var link = this.link = doc.createElement('link');
                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.href = this.address;
                this._loaded = new Promise(function (resolve, reject) {
                    var timeout = setTimeout(function () {
                        reject('Unable to load CSS');
                    }, waitSeconds * 1000);
                    var loadCB = function (event) {
                        clearTimeout(timeout);
                        link.removeEventListener('load', loadCB);
                        link.removeEventListener('error', loadCB);
                        if (event && event.type === 'error') {
                            reject('Unable to load CSS');
                        } else {
                            resolve('');
                        }
                    };
                    if ('isApplicationInstalled' in navigator || !link.addEventListener) {
                        onloadCss(link, loadCB);
                    } else if (navigator.noUI) {
                        loadCB();
                    } else {
                        link.addEventListener('load', loadCB);
                        link.addEventListener('error', loadCB);
                    }
                    getHead().appendChild(link);
                });
                return this._loaded;
            },
            injectStyle: function () {
                var doc = getDocument();
                var head = getHead();
                var style = this.style = doc.createElement('style');
                style.type = 'text/css';
                if (style.sheet) {
                    style.sheet.cssText = this.source;
                } else if (style.styleSheet) {
                    style.styleSheet.cssText = this.source;
                } else {
                    style.appendChild(doc.createTextNode(this.source));
                }
                head.appendChild(style);
            },
            ie9StyleSheetLimitHack: function () {
                var doc = getDocument();
                if (!CSSModule.cssCount) {
                    CSSModule.currentStyleSheet = doc.createStyleSheet();
                }
                CSSModule.cssCount += 1;
                CSSModule.currentStyleSheet.cssText += this.source;
                if (CSSModule.cssCount === CSSModule.ie9MaxStyleSheets) {
                    CSSModule.cssCount = 0;
                }
            },
            updateURLs: function () {
                var rawSource = this.source, address = this.address;
                this.source = rawSource.replace(importRegEx, function (whole, part) {
                    if (isNode) {
                        return '@import url(' + part + ')';
                    } else {
                        return '@import url(' + steal.joinURIs(address, part) + ')';
                    }
                });
                if (!loader.isEnv('build')) {
                    this.source = this.source + '/*# sourceURL=' + address + ' */';
                    this.source = this.source.replace(resourceRegEx, function (whole, part) {
                        return 'url(' + steal.joinURIs(address, part) + ')';
                    });
                }
                return this.source;
            },
            getExistingNode: function () {
                var doc = getDocument();
                var selector = '[href=\'' + this.address + '\']';
                return doc.querySelector && doc.querySelector(selector);
            },
            linkExists: function () {
                var styleSheets = getDocument().styleSheets;
                for (var i = 0; i < styleSheets.length; ++i) {
                    if (this.address === styleSheets[i].href) {
                        return true;
                    }
                }
                return false;
            },
            setupLiveReload: function (loader, name) {
                var head = getHead();
                var css = this;
                if (loader.liveReloadInstalled) {
                    var cssReload = loader['import']('live-reload', { name: module.id });
                    Promise.resolve(cssReload).then(function (reload) {
                        loader['import'](name).then(function () {
                            reload.once('!dispose/' + name, function () {
                                css.style.__isDirty = true;
                                reload.once('!cycleComplete', function () {
                                    head.removeChild(css.style);
                                });
                            });
                        });
                    });
                }
            }
        };
        if (loader.isEnv('production')) {
            exports.fetch = function (load) {
                var css = new CSSModule(load.address);
                return css.injectLink();
            };
        } else {
            exports.instantiate = function (load) {
                var loader = this;
                var css = new CSSModule(load.address, load.source);
                load.source = css.updateURLs();
                load.metadata.deps = [];
                load.metadata.format = 'css';
                load.metadata.execute = function () {
                    if (getDocument()) {
                        if (isIE9()) {
                            css.ie9StyleSheetLimitHack();
                        } else {
                            css.injectStyle();
                        }
                        css.setupLiveReload(loader, load.name);
                    }
                    return loader.newModule({ source: css.source });
                };
            };
        }
        exports.CSSModule = CSSModule;
        exports.getDocument = getDocument;
        exports.getHead = getHead;
        exports.locateScheme = true;
        exports.buildType = 'css';
        exports.includeInBuild = true;
        exports.pluginBuilder = 'steal-css/slim';
    }(function () {
        return this;
    }(), require, exports, module));
});
/*@node-require/steal-less@1.3.4#less-engine-node*/
define('@node-require/steal-less@1.3.4#less-engine-node', [], function(){ return {}; });
/*steal-less@1.3.4#less-engine-node*/
define('steal-less@1.3.4#less-engine-node', [], function(){ return {}; });
/*steal-less@1.3.4#less*/
define('steal-less@1.3.4#less', [], function(){ return {}; });
/*authentication@1.0.0#main*/
define('authentication@1.0.0#main', [
    'jquery',
    'backbone',
    './html/base.stache',
    'css/core.less'
], function (_jquery, _backbone, _base) {
    'use strict';
    var _jquery2 = _interopRequireDefault(_jquery);
    var _backbone2 = _interopRequireDefault(_backbone);
    var _base2 = _interopRequireDefault(_base);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    var baseView = _backbone2.default.View.extend({
        el: '#app',
        initialize: function initialize() {
            this.$el.append((0, _base2.default)());
        }
    });
    new baseView();
});