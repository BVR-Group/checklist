# Checklist

A checklist web app for DCS. Use to help look up various hotkeys, or complete a system procedure. It is optimized for small screen displays and should work great in all modern browsers.

## Contributing
- Fork this repository.
- Make desired changes.
- Open a pull request and wait for review.

If a change is accepted it will be merged and will go live in a matter of minutes at [http://bvr.group/checklist](http://bvr.group/checklist).

### Getting Started
- **Install dependencies** - Installs everything you need to start working.

  ```$ yarn install```

- **Development** - Will run a server so you can view your changes locally. Will recompile every time you change ```index.js```. You can make changs to json and index.html, and just reload your browser to see changes made to those files.

  ```$ yarn run dev```

- **Building** - Will package everything up in bundle.js and make it ready for deployment.

  ```$ yarn run build```


## JSON Files
- All lists are located in the ```/aircraft``` directory in their relevant json file.
- ```/aircraft/index.json``` is the index of available JSON files to load.

| Entry | Type | Description|
|---|---|---|
| `name` | `string` | The name of the aircraft covered by this JSON. Shown on the index view.
| `image` | `string` | An image that will be shown in the background of the checklist. **A black SVG is preferred.**|
| `item` | `{ string, string }` | Represents an item in a `procedures` or `systems` array. The first `string` is the label, the second is a shortcut key or can be some text value. |
| `procedures` | `array` of `items` | For quick reference of procedures and the corresponding shortcut keys. |
| `systems` | `array` of `items` | For quick reference of specific shortcut keys related to a system.

## Adding an Aircraft
- Create a ```<newAircraft-name>.json``` in the ```/aircraft ``` directory.
- Add ```<newAircraft-name>``` to the ```/aircraft/index.json``` file.
- Reload Checklist.

Refer to an existing json file for examples on how to create a new list.
