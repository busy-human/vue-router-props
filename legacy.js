const RE_VERSION = /^1|^2/i;

function requireRouterOption(feature) {
    if(!RouteProps.router) {
        console.trace();
        throw new Error(`Vue.use(RouteProps, {...}) should define the "router" in order to use [${feature}] on a Vue component`);
    }
}

const RoutePropsMixin = {
    watch: {
        $route: function(newVal, oldVal) {
            if(newVal !== oldVal) {
                this.applyRouteProps();
            }
        }
    },
    // EXAMPLE
    // routeProps: {
    //     layout: { default: "floating", mapTo: "layout" }
    // },
    // END EXAMPLE
    created() {
        if(!RouteProps.installed) {
            throw "RouteProps must be installed with Vue.use before using the mixin";
        }
    },
    mounted() {
        this.applyRouteProps();
    },
    methods: {
        applyRouteProps() {
            if(this.$options.routeProps) {
                var keys = Object.keys(this.$options.routeProps);
                var route = this.$route;
                var resolvedData = resolveRouteData(route.matched);

                keys.forEach(key => {
                    var val;
                    if(key === "requiresAuth") {
                        requireRouterOption("RouteProps.requiresAuth");
                        val = RouteProps.router.isAuthenticatedRoute(route);
                    } else {
                        val = resolvedData[key] || resolvedData.meta[key];
                    }
                    var option = this.$options.routeProps[key];

                    var mapTo = option.mapTo || key;
                    var mapFn = option.fn;

                    // If no routes were matched or the route did not specify a value then use the default
                    if(route.matched.length === 0 || val === undefined) {
                        this[mapTo] = option.default;
                    } else if(mapFn) {
                        this[mapTo] = mapFn(val);
                    } else {
                        this[mapTo] = val;
                    }
                });
            }
        }
    }
}

/**
 * Applies inheritance as necessary
 * @param {*} matchedRoutes
 */
function resolveRouteData(matchedRoutes) {
    var resolvedObj = { meta: {} };
    if(!matchedRoutes || matchedRoutes.length === 0) {
        return resolvedObj;
    } else if(matchedRoutes.length == 1) {
        return matchedRoutes[0];
    } else {
        for(let i = 0; i < matchedRoutes.length; i++) {
            let r = matchedRoutes[i];
            var meta = Object.assign(resolvedObj.meta, r.meta || {});
            resolvedObj = Object.assign(resolvedObj, r || {});
            resolvedObj.meta = meta;
        }
        return resolvedObj;
    }
}

export const RouteProps = {
    mixin:      RoutePropsMixin,
    router:     null,
    installed:  false,
    install:    function(Vue, { global = true, router } = {global: false}) {
        if( ! Vue.version.match(RE_VERSION) ) {
            console.warn(`vue-router-props/legacy requires Vue 2.x, but you are using ${Vue.version}. Use the main import instead`);
        }

        var strategies = Vue.config.optionMergeStrategies;
        strategies.routeProps = strategies.methods;
        RouteProps.installed = true;

        if(global) {
            Vue.mixin(RoutePropsMixin);
        }
        if(router) {
            RouteProps.router = router;
        }
    }
};

export default RouteProps;