"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterPropsPlugin = void 0;
var vue_1 = require("vue");
var RE_VERSION = /^3|^4/i;
var routers = new Map();
/**
 * Warns if an unsupported version of Vue is used
 * @param app
 */
function checkVersion(app) {
    if (!app.version.match(RE_VERSION)) {
        console.warn("vue-router-props requires Vue 3.x or above, but you are using ".concat(app.version, ". Use the main vue-router-props/legacy instead"));
    }
}
/**
 * Applies inheritance as necessary
 * @param {*} matchedRoutes
 */
function resolveRouteData(matchedRoutes) {
    var resolvedObj = { meta: {} };
    if (!matchedRoutes || matchedRoutes.length === 0) {
        return resolvedObj;
    }
    else if (matchedRoutes.length == 1) {
        return matchedRoutes[0];
    }
    else {
        for (var i = 0; i < matchedRoutes.length; i++) {
            var r = matchedRoutes[i];
            var meta = Object.assign(resolvedObj.meta, r.meta || {});
            resolvedObj = Object.assign(resolvedObj, r || {});
            resolvedObj.meta = meta;
        }
        return resolvedObj;
    }
}
function factory(_a) {
    var router = _a.router, injectionKey = _a.injectionKey;
    var refs = new Map();
    var onChangeEvents = new Map();
    var rp = {
        router: router,
        injectionKey: injectionKey,
        /**
         *
         * @param propName top level property name. If its a default route property it'll use that. Otherwise it'll check route.meta for the property.
         * @returns
         */
        ref: function (propName) {
            var r;
            if (refs[propName]) {
                r = refs[propName];
            }
            else {
                if (propName in router.currentRoute.value) {
                    r = refs[propName] = (0, vue_1.ref)(router.currentRoute.value[propName]);
                }
                else {
                    r = refs[propName] = (0, vue_1.ref)(router.currentRoute.value.meta[propName]);
                }
            }
            return r;
        },
        /**
         *
         * @param propName top level property name. If its a default route property it'll use that. Otherwise it'll check route.meta for the property.
         * @returns
         */
        onChange: function (propName, cb) {
            if (!onChangeEvents.has(propName)) {
                onChangeEvents.set(propName, []);
            }
            var events = onChangeEvents.get(propName);
            if (!events) {
                throw new Error("Expected onChange to instantiate the onChange event list");
            }
            events.push(cb);
        },
        /**
         * Updates any refs and calls any onChange callbacks
         */
        applyRouteProps: function () {
            if (refs.size > 0) {
                var route = router.currentRoute;
                var resolvedData = resolveRouteData(route);
                refs.forEach(function (ref, propName) {
                    var prevVal = ref.value;
                    ref.value = resolvedData[propName] || resolvedData.meta[propName];
                    // Trigger any onChange callbacks
                    var callbacks = onChangeEvents.get(propName);
                    if (callbacks && callbacks.length > 0) {
                        callbacks.forEach(function (cb) { return cb(ref.value, prevVal); });
                    }
                });
            }
        }
    };
    (0, vue_1.watch)(router.currentRoute, function (newVal, oldVal) {
        if (newVal !== oldVal) {
            rp.applyRouteProps();
        }
    }, { deep: true });
    // Immediately apply the route props to start with the current route
    rp.applyRouteProps();
    return rp;
}
/**
 * Track and react to route property changes, especially when
 * the currentRoute changes and a common state is changed as a result.
 * @example
 * Vue.use(RouterPropsPlugin, { router });
 *
 * // In your components or views, call inject
 * const routerProps = inject("RouterProps");
 *
 * // Get ref for currentRoute.path
 * const path = routerProps.ref("path");
 *
 * // Get ref for currentRoute.meta.showHeader
 * const showHeader = routerProps.ref("showHeader");
 *
 * // React to changes on certain properties (e.g. currentRoute.meta.requiresAuth
 * routerProps.onChange("requiresAuth", (required) => {
 *      checkNeedsLogin();
 * })
 */
exports.RouterPropsPlugin = {
    /**
     * Installs the plugin with the given router. Run the install function
     * once per router. If you install multiple routers, you'll need to provide
     * a different injectionKeySuffix for each router after the first one.
     * @param app
     * @param options
     */
    install: function (app, _a) {
        var router = _a.router, injectionKeySuffix = _a.injectionKeySuffix;
        checkVersion(app);
        var injectionKey = injectionKeySuffix ? "RouterProps".concat(injectionKeySuffix) : "RouterProps";
        if (!routers.has(injectionKey)) {
            var rp = factory({ router: router, injectionKey: injectionKey });
            routers.set(injectionKey, rp);
            app.provide(injectionKey, rp);
        }
        else {
            throw new Error("vue-router-props: ".concat(injectionKey, " is already registered. You only need to register each router once. Provide a different injectionKeySuffix if you need to register multiple routers."));
        }
    }
};
exports.default = exports.RouterPropsPlugin;
