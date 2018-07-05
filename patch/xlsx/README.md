# [SheetJS Core Build](http://sheetjs.com)

The [community edition documentation](https://docs.sheetjs.com/) covers basic
API and functionality.  This build includes the following features:


## Importing and Exporting with Styles

The `cellStyles` option should be passed to the `read` and `write` functions:

```js
var wb = XLSX.readFile("test.xlsx", {cellStyles: true});
XLSX.writeFile(wb, "out.xlsx", {cellStyles: true});
```


### Color Objects

The most consistent way to specify a color is with a RGB string or hex code:

```js
ws.A1.s = { color: { rgb: "FF0000" }}; // red
```

<details>
	<summary><b>Other color specifications</b> (click to show)</summary>

For round-tripping worksheet styles, it is also possible to use a color from the
default system theme:

```js
ws.A2.s = { color: { theme: 1, tint: 0.4 }};
```

There is also a basic palette accessible as "indexed" colors:

```js
ws.A2.s = { color: { indexed: 12 }};
```

</details>


### Text Styling

Each cell has a style object accessible at the `.s` key of the cell, following
the schema:

| key         | description                                                 |
|:------------|:------------------------------------------------------------|
| `bold`      | Set to `true` to bold the cell text                         |
| `italic`    | Set to `true` to italicize the cell text                    |
| `underline` | 1 = single, 2 = double                                      |
| `sz`        | Font size in pts (e.g. 10, 12, 14)                          |
| `strike`    | Set to `true` for strike-through effect                     |
| `name`      | Font name                                                   |
| `color`     | Color object                                                |
| `valign`    | Vertical alignment: `sub` (subscript) `super` (superscript) |

For example, the following worksheet tests bold and italic:

```js
var ws = XLSX.utils.aoa_to_sheet([
	["Normal"],
	["Bold"],
	["Italic"],
	["B+I"],
]);

ws["A2"].s = { bold: true };
ws["A3"].s = { italic: true };
ws["A4"].s = { bold: true, italic: true };
```


#### Rich Text

For more advanced text styling, the `.R` key of a cell can be set to an array of
cell objects.  The writer will apply the relevant style to each individual block
and concatenate the result.

For example, the following cell will contain the text "<b>bold</b><i>italic</i>"
where `bold` is bold and `italic` is italicized:

```js
ws["A1"].R = [
	{t:'s', v:'bold', s:{bold:true}},
	{t:'s', v:'italic', s:{italic:true}},
];
```

If the rich text array is specified, it will be used in lieu of the `.v` text.


### Cell Alignment and Wrapping

Cell Alignment properties are controlled in the `alignment` key of the style
object.  The supported `alignment` features are explained in the table below:

| key          | description                                                   |
|:-------------|:--------------------------------------------------------------|
| `horizontal` | Horizontal alignment: `"left" "center" "right"`               |
| `vertical`   | Vertical alignment: `"top" "center" "bottom"`                 |
| `wrapText`   | if `true`, text is wrapped (`"\n"` chars appear as new lines) |

For example, the following cell will contain the wrapped text `"a\nb\nc"`, using
top vertical alignment and left horizontal alignment:

```js
ws["A1"] = {
	t: "s", /* string cell */
	v: "a\nb\nc", /* use standard \n newline.  do not include \r */
	s: {
		alignment: {
			horizontal: "left",
			vertical: "top",
			wrapText: true
		}
	}
};
```


The following sample stresses the 9 alignment pairs and text wrapping:

<details>
	<summary><b>Alignment Example</b> (click to show)</summary>

```js
var ws = XLSX.utils.aoa_to_sheet([
	["TL", "TC", "TR", "a\nb\nc", "a\nb\nc"],
	["CL", "CC", "CR", "d\ne\nf"],
	["BL", "BC", "BR", "g\nh\ni"],
]);

/* --- Horizontal Alignment --- */
/* Left-align   A1:A3 */
XLSX.utils.sheet_set_range_style(ws, "A1:A3", {alignment: { horizontal: "left" }});
/* Center-align B1:B3 */
XLSX.utils.sheet_set_range_style(ws, "B1:B3", {alignment: { horizontal: "center" }});
/* Right-align  C1:C3 */
XLSX.utils.sheet_set_range_style(ws, "C1:C3", {alignment: { horizontal: "right" }});

/* --- Vertical Alignment --- */
/* Top-align    A1:C1 */
XLSX.utils.sheet_set_range_style(ws, "A1:C1", {alignment: { vertical: "top" }});
/* Center-align A2:C2 */
XLSX.utils.sheet_set_range_style(ws, "A2:C2", {alignment: { vertical: "center" }});
/* Bottom-align A3:C3 */
XLSX.utils.sheet_set_range_style(ws, "A3:C3", {alignment: { vertical: "bottom" }});

/* --- Wrap D1:D4 (leave E1 unwrapped) --- */
XLSX.utils.sheet_set_range_style(ws, "D1:D3", {alignment: { wrapText: true }});
```

</details>

### Cell Background

To set a solid cell background, assign to the `.s.fgColor` property:

```js
ws.A3.s = { fgColor: 0xFF0000 }; // green background
```


### Cell Borders

The `s.top`, `s.bottom`, `s.left` and `s.right` properties control cell borders.
They are shaped as follows:

| key     | description             |
|:--------|:------------------------|
| `style` | border type (see below) |
| `color` | color object            |

The valid border values are

```
thin
medium
thick
dotted
hair
dashed
mediumDashed
dashDot
mediumDashDot
dashDotDot
mediumDashDotDot
slantDashDot
```

For example:

```js
ws["A4"].s = {
	top: { style: "thin" }, // thin black border on top
	bottom: { style: "thick", color: { rgb: 0xFF0000 } }, // red thick border
	left: { style: "dashed", color: { rgb: 0x00FF00 } } // green dashed border
}
```


### Cell Widths

Excel calculates column widths on save.  For new files, use the column object
`.auto` property to trigger a calculation when the file is saved:


```js
if(!ws['!cols']) ws['!cols'] = [];
ws['!cols'][1] = { auto: 1}; // set the second column to auto-fit width
```


### Naming Styles

Styles are not named by default.  To force a name, set the `style` property of
the `.s` style object:

```js
ws["A4"].s.style = "Test Name";
```


### API

`XLSX.utils.sheet_set_range_style` applies a style to a range of cells.  Text
and background styles are applied to every cell, while borders are applied to
the exterior sides in a range.  For example, given the sheet

```
XXX| A | B | C | D |
---+---+---+---+---+
 1 | 1 | 2 | 3 | 4 |
 2 | 5 | 6 | 7 | 8 |
 3 | 9 | A | B | C |
 4 | D | E | F | 0 |
```

This code will set:
- background and text color for every cell in `B2:C3` and
- left border of cells `B2:B3`
- right border of cells `C2:C3`
- top border of cells `B2:C2`
- bottom border of cells `B3:C3`

```js
XLSX.utils.sheet_set_range_style(
	ws, // worksheet
	"B2:C3", // range
	{ // style object
		fgColor: { rgb: 0x0000FF }, // blue solid background
		color: { rgb: 0xFFFFFF }, // white text
		top: { style: "thick", color: { rgb: 0xFFFF00 } }, // thick yellow border
		bottom: { style: "thick", color: { rgb: 0xFF0000 } }, // red thick border
		left: { style: "dashed", color: { rgb: 0x00FF00 } } // green dashed border
	}
);
```

Set a style to `false` to remove (e.g. `bold: false` will remove bold cells)


## Data Validations

Data Validations are stored in the `!validations` array of the worksheet:

```js
ws['!validations'] = [
	/* A1:A5 show a fixed dropdown menu with specified values */
	{
		ref: 'A1:A5',
		t: 'List',
		l: ["a", "b", "c", "d", "e"]
	},
	/* B1:B5 are restricted to integers between 0 and 10 */
	{
		ref: 'B1:B5',
		t: 'Whole',
		op: 'IN',
		min: 0,
		max: 10
	}
]
```

Each validation object in the array follows the schema:

| key         | description                                |
|:------------|:-------------------------------------------|
| `ref`       | Range or cell string or address object     |
| `t`         | Type of Data Validation (see table)        |
| `l`         | Array of strings for a fixed dropdown List |
| `f`         | Formula or Range for Custom or List DV     |
| `op`        | Data operator (see below)                  |
| `min/max/v` | Min / Max / Exact values for the operator  |

The `ref` reference can be passed as a string ("A2" or "A2:C4") or address
object like `{r:1, c:0}` or range like `{s:{r:1,c:0}, e:{r:3,c:2}}`.

### Data Validation Types

The `type` refers to the "Allow" option in the Settings tab of Data Validation:

| type        | Excel interface name | Operator | Parameters          |
|:------------|:---------------------|:--------:|:--------------------|
| `"Any"`     | "Any Value"          |    No    |                     |
| `"Whole"`   | "Whole number"       |   Yes    | `min` / `max` / `v` |
| `"Decimal"` | "Decimal"            |   Yes    | `min` / `max` / `v` |
| `"List"`    | "List"               |    No    | `l` or `f`    / `v` |
| `"Date"`    | "Date"               |   Yes    | `min` / `max` / `v` |
| `"Time"`    | "Any Value"          |   Yes    | `min` / `max` / `v` |
| `"Length"`  | "Text length"        |   Yes    | `min` / `max` / `v` |
| `"Custom"`  | "Custom"             |    No    | `f`                 |

### Data Validation Operators

For the numeric data validations, ranges are specified in terms of operators:

| operator | Excel interface name       | min | max | v   |
|:---------|:---------------------------|:----|:----|:----|
| `"IN"`   | "between"                  | Yes | Yes |  No |
| `"OT"`   | "not between"              | Yes | Yes |  No |
| `"EQ"`   | "equal to"                 |  No |  No | Yes |
| `"NE"`   | "not equal to"             |  No |  No | Yes |
| `"GT"`   | "greater than"             |  No |  No | Yes |
| `"LT"`   | "less than"                |  No |  No | Yes |
| `"GE"`   | "greater than or equal to" |  No |  No | Yes |
| `"LE"`   | "less than or equal to"    |  No |  No | Yes |


## Miscellaneous Worksheet Properties

### Freeze Panes

Freeze panes are specified by setting the `!freeze` key of the worksheet object
to a cell reference (string or object) corresponding to the "top-left" cell of
the main pane.  This is the exact cell you would select in Excel before applying
the "Freeze pane" option in the Excel UI.

```js
ws["!freeze"] = "A2"; // Freeze first row               bottom pane starts at A2
ws["!freeze"] = "B1"; // Freeze first column             right pane starts at B1
ws["!freeze"] = "B2"; // Freeze row and column    bottom-right pane starts at B2
```


## Simple Examples


### File from Scratch

The most common use case involves cleaning up an export from a data store:

```js
var XLSX = require("@sheet/<replace with your ID>");

/* Build up a worksheet from your data */
var ws = XLSX.utils.aoa_to_sheet([
	["Item", "Price"]
]);
XLSX.utils.sheet_add_json(ws, [
	{ Item: "abc", Price: 1.23 },
	{ Item: "def", Price: 4.56 },
]);

/* Bold the headers */
XLSX.utils.sheet_set_range_style(ws, "A1:B1", {
	bold: true
});

/* Set the format for the visible cells in the price column */
var range = XLSX.utils.decode_range(ws['!ref']);
range.s.c = 1; // start from second col
range.e.c = 1; // end on the second col
XLSX.utils.sheet_set_range_style(ws, range, {
	z: "0.00" // decimal with 2 places
});

/* Write File */
var wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Test");
XLSX.writeFile(wb, "e1.xlsx", {cellStyles: true});
```

### Spicing up CSV Exports

Another common use case involves cleaning up a data export from another process:

```js
var XLSX = require("@sheet/<replace with your ID>"); // node or webpack

/* Read the file */
var wb = XLSX.readFile("e2.csv");
var ws = wb.Sheets[wb.SheetNames[0]];

/* Find the header row */
var range = XLSX.utils.decode_range(ws['!ref']);
range.s.r = 0; range.e.r = 0; // restrict to the first row

/* Bold the headers */
XLSX.utils.sheet_set_range_style(ws, range, {
	bold: true
});

/* Freeze first row */
ws["!freeze"] = "A2";

/* Write to XLSX */
XLSX.writeFile(wb, "e2.xlsx", {cellStyles: true});
```

### Modifying Existing Files

Read in the file with `cellStyles:true` to initialize the styles data:

```js
var XLSX = require("@sheet/<replace with your ID>");

/* read the file from the first export */
var wb = XLSX.readFile("e1.xlsx", {cellStyles:true});
/* get the first worksheet */
var ws = wb.Sheets[wb.SheetNames[0]];
/* turn off bold */
XLSX.utils.sheet_set_range_style(ws, "A1:B1", {bold: false});

/* Write to XLSX */
XLSX.writeFile(wb, "e3.xlsx", {cellStyles: true});
```

### Exporting an HTML TABLE on the DOM

`table_to_book` and `table_to_sheet` automatically process CSS styles:

```js
var dom_elt = document.getElementById('data-table');
var wb = XLSX.utils.table_to_book(dom_elt);
XLSX.writeFile(wb, "export.xlsx", {cellStyles:true});
```

This technique works in JSDOM for server-side applications:

```js
const fs = require("fs");
const { JSDOM } = require('jsdom');

/* load HTML into the DOM */
const dom = new JSDOM(fs.readFileSync("table.html").toString());
const elt = dom.window.document.querySelector("#table"); // replace with table id

/* to detect styles, getComputedStyle has to be visible */
getComputedStyle = dom.window.getComputedStyle;

/* generate workbook using table_to_book and export */
const wb = XLSX.utils.table_to_book(elt);
XLSX.writeFile(wb, "tablexport.xlsx", {cellStyles:true, WTF:1});
```
