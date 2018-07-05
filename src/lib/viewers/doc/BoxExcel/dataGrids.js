import React, { PureComponent } from 'react';
import _ from 'lodash';

import Tab from 'box-react-ui/lib/components/tab-view/Tab';
import TabView from 'box-react-ui/lib/components/tab-view/TabView';
import VirtualGrid from './virtualGrid';

class DataGrids extends PureComponent {
    /**
     * react component render function
     * @return {XML}
     */
    render() {
        const { workbook } = this.props;

        const wbSettings = workbook.Workbook;

        const nonHiddenSheetsNames = _.chain(wbSettings.Sheets)
            .filter((s) => s.Hidden === 0)
            .map((s) => s.name)
            .value();

        const colorScheme = workbook.Themes
            ? workbook.Themes.themeElements.clrScheme
            : [];

        return (
            <TabView className='full-height'>
                {_.map(nonHiddenSheetsNames, (name) => {
                    return (
                        <Tab key={name} title={name}>
                            <VirtualGrid
                                sheet={workbook.Sheets[name]}
                                views={wbSettings.Views}
                                theme={colorScheme}
                            />
                        </Tab>
                    );
                })}
            </TabView>
        );
    }
}

export default DataGrids;
