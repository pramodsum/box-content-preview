import React, { Component } from 'react';
import Tab from 'box-react-ui/lib/components/tab-view/Tab';
import TabView from 'box-react-ui/lib/components/tab-view/TabView';
import PropTypes from 'prop-types';
import Sheet from './sheet';
import { ICON_ZOOM_IN, ICON_ZOOM_OUT } from '../../../icons/icons';

class Workbook extends Component {
    static propTypes = {
        // eslint-disable-next-line
        workbook: PropTypes.object.isRequired,
        // eslint-disable-next-line
        controls: PropTypes.object.isRequired
    };

    /**
     * [constructor]
     *
     * @param {Object} props React element properties, see above
     */
    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: 0
        };
        this.sheets = [];
    }

    componentDidMount() {
        const { controls } = this.props;
        controls.add(__('zoom_out'), () => this._zoom(0.9), 'bp-text-zoom-out-icon', ICON_ZOOM_OUT);
        controls.add(__('zoom_in'), () => this._zoom(1.1), 'bp-text-zoom-in-icon', ICON_ZOOM_IN);
    }

    onTabSelect = (selectedIndex) => this.setState({ selectedIndex });

    _zoom = (ratio) => {
        const { selectedIndex } = this.state;
        this.sheets[selectedIndex]._zoom(ratio);
    };

    /**
     * Get sheets and settings from workbook, render sheets in TabView
     * Each sheet ocupies a tab
     * @return {jsx} A TabView with all the sheets
     */
    render() {
        const { workbook } = this.props;
        const wbSettings = workbook.Workbook;
        const nonHiddenSheetsNames = wbSettings
            ? wbSettings.Sheets.filter((s) => s.Hidden === 0).map((s) => s.name)
            : workbook.SheetNames;
        const colorScheme = workbook.Themes ? workbook.Themes.themeElements.clrScheme : [];

        return (
            <TabView className='full-height' onTabSelect={this.onTabSelect}>
                {nonHiddenSheetsNames.map((name) => {
                    return (
                        <Tab key={name} title={name}>
                            <Sheet
                                ref={(ref) => {
                                    this.sheets.push(ref);
                                }}
                                sheet={workbook.Sheets[name]}
                                views={wbSettings ? wbSettings.Views : null}
                                theme={colorScheme}
                            />
                        </Tab>
                    );
                })}
            </TabView>
        );
    }
}

export default Workbook;
