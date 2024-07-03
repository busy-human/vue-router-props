# vue-router-props

## Vue 3.0 Version

### Installation

    // In one of your root or main files
    import {RouterPropsPlugin} from "@busy-human/vue-router-props";

    Vue.use(RouterPropsPlugin, { router });

    // Inside your router
    routes = [
        {
            path: '/login',
            component: LoginView,
            name: "Login",
            meta: { showHeader: false }
        },
    ]

### Usage

    // In your components or views, call inject
    const routerProps = inject("RouterProps");

    // Get refs to route properties or meta properties

    // Get ref for currentRoute.path
    const path = routerProps.ref("path");

    // Get ref for currentRoute.meta.showHeader
    const showHeader = routerProps.ref("showHeader");

    // React to changes on certain properties (e.g. currentRoute.meta.requiresAuth)
    routerProps.onChange("requiresAuth", (required) => {
        checkNeedsLogin();
    })

## Legacy Version

Automatically bind to route properties and meta data and set data values on your Vue instance accordingly

The RouteProps mixin makes it easy to react to route changes and updates, allowing you to specify additional data for a route on the route object itself. For example, maybe some of your routes need to be in fullscreen, or need to have the header hidden.

### Installation

    import {RouteProps} from "vue-router-props";
    Vue.use(RouteProps);

    // Inside your component
    {
        props: ["someProp"],
        routeProps: {
            showHeader:     { default: true, mapTo: "visible" }
        },
        data() {
            return { visible: true }
        }
    }

    // Inside your router
    routes = [
        {
            path: '/login',
            component: LoginView,
            name: "Login",
            meta: { showHeader: false }
        },
    ]

### Usage

RouteProps enables you to access properties directly on the route object such as the route name, path, etc. Or, you can add custom data inside the meta field of the route object. The name you use in your routeProps field will be what is used to lookup the value in the route object.

**default:** The default value will be used if there is no matching route object, or if the route does not have the field it is looking for. This allows you to cut down on redundant code and rely on the default. For example, maybe your header is usually visible in the app but on just a few views you need it to be hidden. In this case, you would only need to add the showHeader meta property to the routes that need the header hidden.

**mapTo:** This will determine which field on your Vue instance the route data will be assigned to. In the example above we have a data value of visible on our header. If showHeader is true in the route object's meta field, then visible will also be set to true. mapTo is optional however, and if you don't specifiy, then RouteProps will assume the prop has the same name (e.g. showHeader)

**fn:** If you need to transform the data from the route object before assigning it to your Vue field, you can pass in a function via fn. This will receive the value on the route object as the first argument. You should return the value you want assigned to the field.

**requiresAuth:** The AuthGuardMiddleware allows you to protect certain routes from being accessed by unauthenticated users. If you need information about whether the current route requires authentication, you can get that information using RouteProps:

    import {RouteProps} from "@busy-human/vue-component-library";
    Vue.use(RouteProps, { router });

    // Inside your component
    {
        props: ["someProp"],
        routeProps: {
            requiresAuth:     { default: false, mapTo: "authenticatedRoute" }
        },
        data() {
            return { authenticatedRoute: false }
        }
    }

In order for requiresAuth to work, you will need to make sure you pass the router into the Vue.use options for RouteProps.