import React, { Component } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import { utils } from './utils';
import { HEADER_WIDTH, HEADER_HEIGHT } from './const';

/**
 * map chart type to React Component imported from 'react-chartjs-2'
 *
 * @type {Object}
 */
const chartTypeMap = {
    line: Bar,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut
};

/**
 * map legend to chartjs-recognizable
 *
 * @type {Object}
 */
const legendMap = {
    b: 'bottom'
};

class Charts extends Component {
    /* eslint-disable */
    /**
     * sheet spreadsheet data
     * themeColors array of colors
     *
     * @type {Object}
     */
    static propTypes = {
        sheet: PropTypes.object.isRequired,
        themeColors: PropTypes.array.isRequired
    };
    /* eslint-enable */

    /**
     * [constructor]
     *
     * @param {Object} props [description]
     */
    constructor(props) {
        super(props);

        const { sheet } = this.props;
        this.state = {
            charts: sheet['!charts'].map(this._parseChart)
        };
    }

    /**
     * Helper function of _parseChart
     * Re-organize the data of a subplot
     *
     * @param  {Object} chart   Chart object parsed from sheetjs
     * @param  {Array} subPlot  'cat' means chart label, 'val' means chart data
     * @param  {number} counter counter of the whole chart
     * @return {Object}         labels and data of a subplot, and updated counter
     */
    _getRawData = (chart, subPlot, counter) => {
        const { e } = utils.decode_range(chart['!ref']);
        const rowCount = e.r + 1;
        let subLabels = [];
        const subData = [];
        let newCounter = counter;
        subPlot.forEach((key) => {
            for (let r = 0; r < rowCount; ++r) {
                const pos = utils.encode_cell({
                    c: newCounter,
                    r
                });
                if (key === 'cat') {
                    subLabels.push(chart[pos].v);
                } else if (key === 'val') {
                    subData.push(chart[pos].v);
                }
            }
            newCounter += 1;
        });
        if (!subLabels.length) subLabels = Array.from({ length: subData.length }, (_, i) => i + 1);

        return { subLabels, subData, newCounter };
    };

    /**
     * Whether the chart should display Axes
     *
     * @param  {string} type chart type string
     * @return {boolean}     true for certain types
     */
    _displayAxes = (type) => {
        return !(type === 'pie' || type === 'doughnut');
    };

    /**
     * Re-organize sheetjs data to chartjs format
     *
     * @param  {Object} chart chart object parsed from sheetjs
     * @return {Object}       chartjs needed properties
     */
    _parseChart = (chart) => {
        const chartType = chart['!plot'][0].t;
        const position = chart['!pos'];
        let title = chart['!title'];
        const legendPos = chart['!legend'] ? legendMap[chart['!legend'].pos] : null;
        let counter = 0;

        const rawDatasets = [];
        const yAxes = [];
        const plots = chart['!plot'];
        let subPlots = [];
        plots.forEach((plot, i) => {
            subPlots = plot.ser;
            const yAxisID = subPlots[0].names ? subPlots[0].names[0] : `Series${i}`;
            if (!title && subPlots[0].names) title = yAxisID;
            yAxes.push({
                display: this._displayAxes(chartType),
                id: yAxisID,
                type: 'linear',
                position: !yAxes.length ? 'left' : 'right',
                ticks: {
                    beginAtZero: true
                }
            });
            subPlots.forEach((subplot, j) => {
                const { subLabels, subData, newCounter } = this._getRawData(chart, plot.k[j], counter);
                counter = newCounter;
                rawDatasets.push({
                    label: subplot.names ? subplot.names[0] : `Series${i}`,
                    yAxisID,
                    type: plot.t,
                    subLabels,
                    subData
                });
            });
        });

        const { themeColors } = this.props;
        const datasets = rawDatasets.map(({ label, type, subData, yAxisID }, index) => ({
            label,
            type,
            data: subData,
            lineTension: 0,
            fill: false,
            yAxisID,
            backgroundColor: type === 'line' ? themeColors[index] : themeColors,
            borderColor: type === 'line' ? themeColors[index] : 'white'
        }));

        const labels = rawDatasets.length ? rawDatasets[0].subLabels : [];

        return {
            type: chartType,
            data: { datasets, labels },
            options: {
                title: {
                    display: title,
                    text: title
                },
                legend: {
                    position: legendPos,
                    display: !!legendPos
                },
                maintainAspectRatio: false,
                scales: {
                    xAxes: [
                        {
                            display: this._displayAxes(chartType),
                            gridLines: {
                                display: false
                            }
                        }
                    ],
                    yAxes
                }
            },
            height: position.h,
            width: position.w,
            position
        };
    };

    /**
     * Render all the charts on a layer above spreadsheet
     *
     * @return {jsx} rendered jsx
     */
    render() {
        const { charts } = this.state;
        /* eslint-disable */
        return (
            <div style={{ width: '100%', position: 'absolute', top: 0, left: 0 }}>
                {charts.map((chart, idx) => {
                    const ChartType = chartTypeMap[chart.type];
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: chart.position.x + HEADER_WIDTH,
                                top: chart.position.y + HEADER_HEIGHT,
                                height: chart.height,
                                width: chart.width,
                                backgroundColor: 'white'
                            }}
                            key={idx}
                        >
                            <ChartType {...chart} key={idx} />
                        </div>
                    );
                })}
            </div>
        );
        /* eslint-enable */
    }
}

export default Charts;
