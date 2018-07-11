import React, { Component } from 'react';
import Tooltip from 'box-react-ui/lib/components/tooltip';
import { ArrowKeyStepper, MultiGrid, AutoSizer } from 'react-virtualized';
import Draggable from 'react-draggable';
import Immutable from 'immutable';
import { Parser as HtmlToReactParser } from 'html-to-react';
import PropTypes from 'prop-types';
import c from './colors';
import Charts from './charts';
import { HEADER_WIDTH, HEADER_HEIGHT, COLUMN_WIDTH, ROW_HEIGHT } from './const';
import {
    _getVertAlign,
    _getHoriAlign,
    _parseColor,
    _getBackgroundColor,
    borderWidthMap,
    dateConvertor,
    utils
} from './utils';

/**
 * React styles object, like css-in-js
 *
 * @type {Object}
 */
const styles = {
    grids: {
        borderWidth: '1px 0 0 1px',
        borderColor: c.gridGrey,
        borderStyle: 'solid'
    },
    topLeftGrid: {
        borderBottom: `1px solid ${c.gridGrey}`,
        borderRight: `1px solid ${c.gridGrey}`
    },
    headerGrid: {
        borderBottom: `1px solid ${c.gridGrey}`,
        backgroundColor: c.backgroundGrey
    },
    bottomLeftGrid: {
        borderRight: `1px solid ${c.gridGrey}`,
        backgroundColor: c.backgroundGrey
    },
    Cell: {
        padding: '2px 1px 1px 2px',
        borderWidth: '0 1px 1px 0',
        borderStyle: 'solid',
        borderColor: c.gridGrey,
        fontSize: 12,
        float: 'leftbottom',
        boxSizing: 'border-box',
        lineHeight: 'normal'
    },
    headerBorder: {
        borderWidth: '0 1px 1px 0',
        borderStyle: 'solid',
        borderColor: c.gridGrey
    },
    FocusedCell: {
        borderWidth: 2,
        padding: 0,
        borderColor: c.gridGreen
    },
    cellDiv: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        height: '100%',
        width: '100%'
    },
    headerAlign: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    focusedDiv: {}
};

class Sheet extends Component {
    /* eslint-disable */
    /**
     * sheet spreadsheet data
     * views spreadsheet view settings
     * theme spreadsheet color scheme
     */
    static propTypes = {
        sheet: PropTypes.object.isRequired,
        views: PropTypes.array.isRequired,
        theme: PropTypes.array.isRequired
    };
    /* eslint-enable */

    /**
     * [constructor]
     *
     * @param {Object} props React element properties, see above
     */
    constructor(props) {
        super(props);

        // initial state values
        this.state = {
            sheet: null,
            rowCount: 0,
            columnCount: 0,
            scrollToRow: 1,
            scrollToColumn: 1,
            columnWidth: 0,
            rowHeight: 0,
            columnWidths: Immutable.Map(),
            rowHeights: Immutable.Map(),
            merges: {},
            zoom: 1.0,
            gridlines: true,
            themeColors: []
        };
    }

    /**
     * Before rendering, parse dimention, settings, and theme
     *
     * @return {void}
     */
    componentWillMount() {
        // console.log('start rendering', performance.now());
        const { sheet, views, theme } = this.props;
        const {
            rowCount,
            columnCount,
            rowHeight,
            columnWidth,
            rowHeights,
            columnWidths,
            merges
        } = this._parseDimention(sheet);

        const { zoom, gridlines } = this._parseSettings(views);
        const themeColors = this._parseThemeColors(theme);

        this.setState({
            sheet,
            rowCount,
            columnCount,
            rowHeight,
            columnWidth,
            rowHeights,
            columnWidths,
            merges,
            zoom,
            gridlines,
            themeColors
        });
    }

    /**
     * Triggered when resizing row or column
     *
     * @param  {Object} nextProps next property to change
     * @param  {Object} nextState next state to change
     * @return {void}
     */
    componentWillUpdate(nextProps, nextState) {
        const { rowHeights, columnWidths } = this.state;

        if (rowHeights !== nextState.rowHeights || columnWidths !== nextState.columnWidths) {
            this._grid.recomputeGridSize();
        }
    }

    /**
     * Parse the theme colors, only need 'accent' for now
     *
     * @param  {Array} theme Array of objects consisting of colors
     * @return {Array}       Array of hex color strings
     */
    _parseThemeColors = (theme) => {
        return theme.filter(({ name }) => name.includes('accent')).map(({ rgb }) => `#${rgb}`);
    };

    /**
     * Parse the settings of the spreadsheet
     * Currently, only get zoom ratio and girdlineVisibility,
     * In the future, we can parse more for high fidelity
     *
     * @param  {Object} views View setting object
     * @return {Object}       zoom ratio and girdlineVisibility
     */
    _parseSettings = (views) => {
        const view = views[0];
        return {
            zoom: view.zoom ? view.zoom / 100.0 : 1.0,
            gridlines: view.grid === undefined ? true : view.grid
        };
    };

    /**
     * Get row height of a certain index
     * Required for React-Virtualized
     *
     * @param  {number} index index number, 0 basis. -1 means header
     * @return {number}       row height in px
     */
    _getRowHeight = (index) => {
        if (index === -1) return HEADER_HEIGHT;
        const { rowHeights, rowHeight } = this.state;
        return rowHeights.get(index, rowHeight);
    };

    /**
     * Get column width for a certain index
     * Required for React-Virtualized
     *
     * @param  {number} index index number, 0 basis. -1 means header
     * @return {number}       column width in px
     */
    _getColumnWidth = (index) => {
        if (index === -1) return HEADER_WIDTH;
        const { columnWidths, columnWidth } = this.state;
        return columnWidths.get(index, columnWidth);
    };

    /**
     * Triggered when resizing row or column.
     * Calculate the new value and set in state
     *
     * @param  {number}  delta       Diff between original and new value
     * @param  {numebr}  index       index number, 0 basis
     * @param  {boolean} isRowHeader true if is resizing row, false if column
     * @return {void}
     */
    _resizeHeader = ({ delta, index, isRowHeader }) => {
        const { rowHeights, columnWidths } = this.state;

        if (isRowHeader) {
            let rowHeight = this._getRowHeight(index);
            rowHeight += delta;

            this.setState({
                rowHeights: rowHeights.set(index, rowHeight)
            });
        } else {
            let colWidth = this._getColumnWidth(index);
            colWidth += delta;

            this.setState({
                columnWidths: columnWidths.set(index, colWidth)
            });
        }
    };

    /**
     * Helper function to check if a row or column is hidden (0 px)
     *
     * @param  {number}  rowIndex    row index number, 0 basis
     * @param  {number}  columnIndex col index number, 0 basis
     * @return {boolean}             true if hidden, false if not
     */
    _isHidden = (rowIndex, columnIndex) => {
        const { rowHeights, columnWidths } = this.state;
        if (rowHeights.get(rowIndex) === 0 || columnWidths.get(columnIndex) === 0) return true;
        return false;
    };

    /**
     * Parse the dimention of the spreadsheet, including
     * special row height, special col width,
     * total row numbers, total col numbers,
     * and merged grids
     *
     * @param  {Object} sheet spreadsheet data
     * @return {Object}       parsed data mentioned above
     */
    _parseDimention = (sheet) => {
        let rowHeight;
        let columnWidth;
        let rowHeights = Immutable.Map();
        let columnWidths = Immutable.Map();
        let rowCount = 0;
        let columnCount = 0;

        if (sheet['!ref']) {
            /* global XLSX */
            const { e } = XLSX.utils.decode_range(sheet['!ref']);
            rowCount = e.r + 2;
            columnCount = e.c + 2;
        }

        if (sheet['!sheetFormat']) {
            const { col, row } = sheet['!sheetFormat'];
            rowHeight = row ? row.hpx : ROW_HEIGHT;
            columnWidth = col ? col.wpx : COLUMN_WIDTH;
        } else {
            rowHeight = ROW_HEIGHT;
            columnWidth = COLUMN_WIDTH;
        }

        let row;
        let col;
        if (sheet['!rows']) {
            for (let i = 0; i < rowCount - 1; ++i) {
                row = sheet['!rows'][i];
                if (row && row.hpx) rowHeights = rowHeights.set(i, row.hpx);
                if (row && row.hidden) rowHeights = rowHeights.set(i, 0);
            }
        }
        if (sheet['!cols']) {
            for (let i = 0; i < columnCount - 1; ++i) {
                col = sheet['!cols'][i];
                if (col && col.wpx) columnWidths = columnWidths.set(i, col.wpx);
                if (col && col.hidden) columnWidths = columnWidths.set(i, 0);
            }
        }

        const merges = {};
        let totalHeight;
        let totalWidth;
        if (sheet['!merges']) {
            sheet['!merges'].forEach((merge) => {
                totalHeight = 0;
                totalWidth = 0;
                for (let rowIndex = merge.s.r; rowIndex <= merge.e.r; ++rowIndex) {
                    for (let colIndex = merge.s.c; colIndex <= merge.e.c; ++colIndex) {
                        merges[[rowIndex, colIndex]] = { display: 'none' };
                    }
                    totalHeight += rowHeights.get(rowIndex, rowHeight);
                }
                for (let colIndex = merge.s.c; colIndex <= merge.e.c; ++colIndex) {
                    totalWidth += columnWidths.get(colIndex, columnWidth);
                }
                merges[[merge.s.r, merge.s.c]] = {
                    height: totalHeight,
                    width: totalWidth
                };
            });
        }

        return {
            rowCount,
            columnCount,
            rowHeight,
            columnWidth,
            rowHeights,
            columnWidths,
            merges
        };
    };

    /**
     * Get data object for a certain position
     *
     * @param  {number} rowIndex    row index, 0 basis
     * @param  {number} columnIndex col index, 0 basis
     * @return {Object}             data object for the cell
     */
    _getCell = (rowIndex, columnIndex) => {
        const pos = utils.encode_cell({
            r: rowIndex - 1,
            c: columnIndex - 1
        });
        const { sheet } = this.state;
        return sheet[pos];
    };

    /**
     * Helper function of _getBorder
     *
     * @param  {Object} style style property in a cell object
     * @return {string}       hex color string
     */
    _getBorderColor = (style) => {
        return style && style.color ? _parseColor(style.color) : c.gridGrey;
    };

    /**
     * Helper function of _getBorder
     *
     * @param  {style} style style property in a cell object
     * @return {string}      border width string, default: '1px'
     */
    _getBorderWidth = (style) => {
        return style && style.style && borderWidthMap[style.style] ? borderWidthMap[style.style] : '1px';
    };

    /**
     * Get border style, including borderColor and borderWidth
     *
     * @param  {Object} style style property in a cell object
     * @return {Object}       React style object
     */
    _getBorder = (style) => {
        const borderColor = `${this._getBorderColor(style.top)} ${this._getBorderColor(
            style.right
        )} ${this._getBorderColor(style.bottom)} ${this._getBorderColor(style.left)}`;
        const borderWidth = `${style.top ? this._getBorderWidth(style.top) : '0px'} ${
            style.right ? this._getBorderWidth(style.right) : '1px'
        } ${style.bottom ? this._getBorderWidth(style.bottom) : '1px'} ${
            style.left ? this._getBorderWidth(style.left) : '0px'
        }`;
        return { borderColor, borderWidth };
    };

    /**
     * Get cell content
     *
     * @param  {number} rowIndex    row index, 1 basis, 0 is header
     * @param  {number} columnIndex col index, 1 basis, 0 is header
     * @return {string}             cell content
     */
    _getCellContent = (rowIndex, columnIndex) => {
        if (rowIndex === 0 && columnIndex === 0) {
            return '';
        } else if (rowIndex === 0) {
            return utils.encode_col(columnIndex - 1);
        } else if (columnIndex === 0) {
            return rowIndex;
        }
        const cell = this._getCell(rowIndex, columnIndex);
        if (!cell) return '';
        if (cell.t === 'd') {
            return cell.w ? cell.w : dateConvertor(cell.v, cell.z);
        }
        return cell.w;
    };

    /**
     * Render single cell for at (rowIndex, columnIndex)
     *
     * @param  {any} key               cell key
     * @param  {number} columnIndex    column index 0 basis, -1 means, header
     * @param  {number} rowIndex       row index 0 basis, -1 means header
     * @param  {number} scrollToColumn focused col index, 0 basis
     * @param  {number} scrollToRow    focused row index, 0 basis
     * @param  {Object} style          React style object
     * @return {jsx}                   Rendered jsx
     */
    _cellRenderer = ({ key, columnIndex, rowIndex, scrollToColumn, scrollToRow, style }) => {
        const { merges, gridlines } = this.state;
        const cell = this._getCell(rowIndex, columnIndex);
        const isRowHeader = columnIndex === 0;
        const isColHeader = rowIndex === 0;
        const isHeader = isRowHeader || isColHeader;
        const isFocus = columnIndex === scrollToColumn && rowIndex === scrollToRow;
        const fontColor = cell && cell.s && cell.s.color ? `#${cell.s.color.rgb}` : '#000000';
        const cellStyle =
            cell && cell.s
                ? {
                    fontSize: cell.s.sz,
                    color: fontColor,
                    fontFamily: cell.s.name,
                    fontWeight: cell.s.bold ? 'bold' : 'normal'
                }
                : {};
        let cellBgColor =
            cell && cell.s && cell.s.fgColor && cell.s.patternType
                ? {
                    backgroundColor: cell.s.fgColor.rgb
                        ? `#${cell.s.fgColor.rgb}`
                        : _getBackgroundColor(cell.s.fgColor.indexed, fontColor)
                }
                : {};
        if (Object.keys(cellBgColor).length === 0) cellBgColor = cell ? { backgroundColor: 'white' } : {};
        const cellBorder = cell && cell.s && this._getBorder(cell.s);
        const cellHidden = this._isHidden(rowIndex - 1, columnIndex - 1)
            ? { overflow: 'hidden', borderWidth: 0, padding: 0 }
            : {};
        const divNumber =
            cell && (cell.t === 'n' || cell.t === 'd') ? { justifyContent: 'flex-end', overflow: 'hidden' } : {};
        const divAlign =
            cell && cell.s && cell.s.alignment
                ? {
                    textAlign: cell.s.alignment.horizontal,
                    justifyContent: _getHoriAlign(cell.s.alignment.horizontal),
                    alignItems: _getVertAlign(cell.s.alignment.vertical),
                    whiteSpace: cell.s.alignment.wrapText ? 'initial' : 'nowrap',
                    transform: cell.s.alignment.textRotation
                        ? `rotate(-${cell.s.alignment.textRotation}deg)`
                        : 'initial'
                }
                : {};

        const htmlToReactParser = new HtmlToReactParser();
        const commentHtml =
            cell && cell.c ? <div>{cell.c.map((comment) => htmlToReactParser.parse(comment.h))}</div> : null;

        const divContent = (
            <div
                className={commentHtml && 'divComment'}
                style={Object.assign(
                    {},
                    styles.cellDiv,
                    divNumber,
                    isHeader && styles.headerAlign,
                    isFocus && styles.focusedDiv,
                    divAlign
                )}
            >
                {this._getCellContent(rowIndex, columnIndex)}
            </div>
        );

        /* eslint-disable */
        return (
            <div
                key={key}
                style={Object.assign(
                    {},
                    style,
                    styles.Cell,
                    cellBorder,
                    !gridlines && { borderColor: 'transparent' },
                    isHeader && styles.headerBorder,
                    isFocus && styles.FocusedCell,
                    cellStyle,
                    cellBgColor,
                    isColHeader && { flexDirection: 'row' },
                    merges[[rowIndex - 1, columnIndex - 1]],
                    cellHidden
                )}
                onClick={() =>
                    this._selectCell({
                        scrollToColumn: columnIndex,
                        scrollToRow: rowIndex
                    })
                }
            >
                {commentHtml ? (
                    <Tooltip text={commentHtml} position="middle-right" className="CommentTooltip">
                        {divContent}
                    </Tooltip>
                ) : (
                    divContent
                )}
                {isHeader && (
                    <Draggable
                        axis={isRowHeader ? 'y' : 'x'}
                        defaultClassName={isRowHeader ? 'DragHandle' : 'DragHandleCol'}
                        onDrag={(event, data) =>
                            this._resizeHeader({
                                delta: isRowHeader ? data.deltaY : data.deltaX,
                                index: isRowHeader ? rowIndex - 1 : columnIndex - 1,
                                isRowHeader
                            })
                        }
                        position={{
                            x: 0,
                            y: 0
                        }}
                        zIndex={999}
                    >
                        <div
                            style={
                                isRowHeader
                                    ? {
                                          width: '100%',
                                          height: 3,
                                          position: 'absolute',
                                          bottom: -2,
                                          right: 0
                                      }
                                    : {
                                          width: 3,
                                          height: '100%',
                                          position: 'absolute',
                                          top: 0,
                                          right: -2
                                      }
                            }
                        />
                    </Draggable>
                )}
            </div>
        );
        /* eslint-enable */
    };

    /**
     * record focused cell position
     *
     * @param  {number} scrollToColumn column index, 0 is header
     * @param  {number} scrollToRow    row index, 0 is header
     * @return {void}
     */
    _selectCell = ({ scrollToColumn, scrollToRow }) => {
        this.setState({ scrollToColumn, scrollToRow });
    };

    /**
     * Render sheet
     *
     * @return {jsx} Rendered jsx
     */
    render() {
        const {
            sheet,
            rowCount,
            columnCount,
            scrollToRow,
            scrollToColumn,
            rowHeight,
            columnWidth,
            zoom,
            themeColors
        } = this.state;

        return (
            <div style={{ position: 'relative', height: '100%' }}>
                <AutoSizer>
                    {({ width, height }) => (
                        <ArrowKeyStepper
                            mode='cells'
                            rowCount={rowCount}
                            columnCount={columnCount}
                            isControlled
                            onScrollToChange={this._selectCell}
                            scrollToRow={scrollToRow}
                            scrollToColumn={scrollToColumn}
                        >
                            {({ onSectionRendered }) => (
                                <MultiGrid
                                    ref={(ref) => {
                                        this._grid = ref;
                                    }}
                                    enableFixedColumnScroll
                                    enableFixedRowScroll
                                    fixedColumnCount={1}
                                    fixedRowCount={1}
                                    columnWidth={({ index }) => this._getColumnWidth(index - 1)}
                                    estimatedColumnSize={columnWidth}
                                    columnCount={columnCount}
                                    rowHeight={({ index }) => this._getRowHeight(index - 1)}
                                    estimatedRowSize={rowHeight}
                                    rowCount={rowCount}
                                    style={styles.grids}
                                    styleTopLeftGrid={styles.topLeftGrid}
                                    styleTopRightGrid={styles.topRightGrid}
                                    styleBottomLeftGrid={styles.bottomLeftGrid}
                                    width={width}
                                    height={height}
                                    hideTopRightGridScrollbar
                                    hideBottomLeftGridScrollbar
                                    onSectionRendered={onSectionRendered}
                                    scrollToColumn={scrollToColumn}
                                    scrollToRow={scrollToRow}
                                    cellRenderer={({ key, columnIndex, rowIndex, style }) =>
                                        this._cellRenderer({
                                            key,
                                            columnIndex,
                                            rowIndex,
                                            scrollToColumn,
                                            scrollToRow,
                                            style
                                        })
                                    }
                                />
                            )}
                        </ArrowKeyStepper>
                    )}
                </AutoSizer>
                {sheet['!charts'] && <Charts sheet={sheet} zoom={zoom} themeColors={themeColors} />}
            </div>
        );
    }
}

export default Sheet;
