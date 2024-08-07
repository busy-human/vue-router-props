import { watch, onMounted, Ref, ref, Plugin, App } from "vue";
import { RouteLocationNormalizedLoadedGeneric, Router, RouteRecord } from "vue-router";

/**
 * The object returned when using inject("RouterProps");
 */
export interface RouterProps {
    router: Router;

    /** Key used with Vue provide/inject */
    injectionKey: string;

    /**
     * Returns a Vue ref to the given property of the currentRoute. This ref
     * will resolve to the property of whatever is now the current route.
     * @param propName
     */
    ref<T>(propName: string): Ref<T>,

    /**
     * Runs a callback when the given property of on a currentRoute changes.
     */
    onChange(propName: string, cb: (val: any) => void): void;

    /**
     * Updates all the refs generated when the currentRoute changes.
     */
    applyRouteProps(): void;
}

/**
 * Options used when generating a RouterProps instance
 */
interface FactoryOptions {
    router: Router;
    injectionKey: string;
}

interface RouterPropsPluginOptions {
    router: Router;
    /** Key suffix used by vue.provide and vue.inject.
     * If nothing is provided it will be undefined and the injectionKey will be "RouterProps"
     * Otherwise it will be "RouterProps" + suffix
    */
    injectionKeySuffix?: string;
}

type PropChangeEvent = (newVal: any, oldVal: any) => void;

const RE_VERSION = /^3|^4/i;
const routers = new Map<string, RouterProps>();


/**
 * Warns if an unsupported version of Vue is used
 * @param app
 */
function checkVersion(app: App) {
    if( ! app.version.match(RE_VERSION) ) {
        console.warn(`vue-router-props requires Vue 3.x or above, but you are using ${app.version}. Use the main vue-router-props/legacy instead`);
    }
}

/**
 * Applies inheritance as necessary
 * @param {*} matchedRoutes
 */
function resolveRouteData(...matchedRoutes: { meta: any }[]): any {
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


function factory({router, injectionKey}: FactoryOptions): RouterProps {
    const refs = new Map<string, Ref<any>>();
    const onChangeEvents = new Map<string, PropChangeEvent[]>();

    const rp: RouterProps = {
        router,
        injectionKey,
        /**
         *
         * @param propName top level property name. If its a default route property it'll use that. Otherwise it'll check route.meta for the property.
         * @returns
         */
        ref<T>(propName: keyof RouteLocationNormalizedLoadedGeneric): Ref<T> {
            let r: Ref<T>;
            if(refs.get(propName)) {
                r = refs.get(propName) as Ref<T>;
            } else {
                if(propName in router.currentRoute.value) {
                    r = ref<T>(router.currentRoute.value[propName] as unknown as any) as Ref<T>;
                    refs.set(propName, r);
                } else {
                    r = ref<T>(router.currentRoute.value.meta[propName] as T) as Ref<T>;
                    refs.set(propName, r);
                }
            }
            rp.applyRouteProps();
            return r;
        },
        /**
         *
         * @param propName top level property name. If its a default route property it'll use that. Otherwise it'll check route.meta for the property.
         * @returns
         */
        onChange(propName: string, cb: PropChangeEvent) {
            if( ! onChangeEvents.has(propName)) {
                onChangeEvents.set(propName, []);
            }
            let events = onChangeEvents.get(propName);
            if(!events) {
                throw new Error(`Expected onChange to instantiate the onChange event list`);
            }
            events.push(cb)

        },
        /**
         * Updates any refs and calls any onChange callbacks
         */
        applyRouteProps() {
            if(refs.size > 0) {
                var route = router.currentRoute.value;
                var resolvedData = resolveRouteData(route);

                refs.forEach((ref, propName) => {
                    const prevVal = ref.value;
                    ref.value = resolvedData[propName] || resolvedData.meta[propName];

                    // Trigger any onChange callbacks
                    const callbacks = onChangeEvents.get(propName);
                    if(callbacks && callbacks.length > 0) {
                        callbacks.forEach(cb => cb(ref.value, prevVal));
                    }
                });
            }
        }
    };

    // Update properties when the route changes
    router.beforeEach(function(to, from, next) {
        if(to.fullPath !== from.fullPath) {
            rp.applyRouteProps();
        }
        next();
    });

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
export const RouterPropsPlugin: Plugin = {
    /**
     * Installs the plugin with the given router. Run the install function
     * once per router. If you install multiple routers, you'll need to provide
     * a different injectionKeySuffix for each router after the first one.
     * @param app
     * @param options
     */
    install: function(app, { router, injectionKeySuffix }: RouterPropsPluginOptions) {
        checkVersion(app);
        const injectionKey = injectionKeySuffix ? `RouterProps${injectionKeySuffix}` : "RouterProps";

        // @ts-ignore
        window.BASEROUTER = router;

        if( ! routers.has(injectionKey) ) {
            const rp = factory({router, injectionKey});
            routers.set(injectionKey, rp);
            app.provide(injectionKey, rp);
        } else {
            throw new Error(`vue-router-props: ${injectionKey} is already registered. You only need to register each router once. Provide a different injectionKeySuffix if you need to register multiple routers.`);
        }
    }
};

export default RouterPropsPlugin;