import c from './colors';

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
    rowHeader: {
        width: '100%',
        height: 3,
        position: 'absolute',
        bottom: -2,
        right: 0
    },
    colHeader: {
        width: 3,
        height: '100%',
        position: 'absolute',
        top: 0,
        right: -2
    }
};

export default styles;
