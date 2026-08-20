# RAMS Generator

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment

Set the portal handshake variables before running locally or deploying. The recommended approach is to create an `.env.local` file (ignored by git) in the project root and add the following values:

```bash
PORTAL_SIGNING_SECRET=matching_secret_from_portal
REACT_APP_PORTAL_URL=https://portal.yourdomain.co.uk
PORTAL_URL=https://portal.yourdomain.co.uk
```

Configure Firebase Admin access for the RAMS generator (inline keys or a JSON service account file):

```bash
RAMS_FIREBASE_PROJECT_ID=your-project-id
RAMS_FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
RAMS_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# or point to a JSON file instead
RAMS_FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
RAMS_API_PORT=3101
RAMS_API_ORIGIN=http://localhost:3101
REACT_APP_RAMS_API_ORIGIN=http://localhost:3101
# Optional development bypass if the UCtel portal is unavailable locally
# RAMS_DEV_PORTAL_BYPASS=true
# RAMS_DEV_PORTAL_UID=rams-dev-user
# RAMS_DEV_PORTAL_EMAIL=dev.user@uctel.co.uk
# RAMS_DEV_PORTAL_NAME=RAMS Dev User
```

### Local development

Run both the React dev server and the lightweight API shim with:

```bash
npm run dev
```

This will start the API on `http://localhost:3101` (configurable via `RAMS_API_PORT`) and the React dev server on `http://localhost:3304`, proxying `/api/*` calls automatically. If you prefer manual control, start the servers separately:

```bash
npm run serve-api   # starts only the API shim (defaults to port 3101)
npm start           # runs the CRA dev server on port 3304
```

The app displays a setup warning if the dev API is unreachable so you know to start it.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3304](http://localhost:3304) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
