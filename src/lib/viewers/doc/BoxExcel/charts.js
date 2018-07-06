import React, { Component } from 'react';
import _ from 'lodash';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import XLSX from 'xlsx';
import PropTypes from 'prop-types';
import { HEADER_WIDTH, HEADER_HEIGHT } from './const';

const chartTypeMap = {
    line: Bar,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut
};

const legendMap = {
    b: 'bottom'
};

class Charts extends Component {
    propTypes = {
        sheet: PropTypes.Object.isRequired,
        themeColors: PropTypes.Array.isRequired
    };

    constructor(props) {
        super(props);

        const { sheet } = this.props;
        this.state = {
            charts: _.map(sheet['!charts'], this._parseChart)
        };
    }

    _getRawData = (chart, subPlot, counter) => {
        const { e } = XLSX.utils.decode_range(chart['!ref']);
        const rowCount = e.r + 1;
        let subLabels = [];
        const subData = [];
        let newCounter = counter;
        subPlot.forEach((k) => {
            for (let r = 0; r < rowCount; ++r) {
                const pos = XLSX.utils.encode_cell({
                    c: counter,
                    r
                });
                if (subPlot[k] === 'cat') {
                    subLabels.push(chart[pos].v);
                } else if (subPlot[k] === 'val') {
                    subData.push(chart[pos].v);
                }
            }
            newCounter += 1;
        });
        if (_.isEmpty(subLabels)) subLabels = _.range(1, subData.length + 1);

        return { subLabels, subData, newCounter };
    };

    _displayAxes = (type) => {
        return !(type === 'pie' || type === 'doughnut');
    };

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
        Object.keys(plots).forEach((i) => {
            subPlots = plots[i].ser;
            const yAxisID = subPlots[0].names ? subPlots[0].names[0] : `Series${i}`;
            if (!title && subPlots[0].names) title = yAxisID;
            yAxes.push({
                display: this._displayAxes(chartType),
                id: yAxisID,
                type: 'linear',
                position: _.isEmpty(yAxes) ? 'left' : 'right',
                ticks: {
                    beginAtZero: true
                }
            });
            Object.keys(subPlots).forEach((j) => {
                const { subLabels, subData, newCounter } = this._getRawData(chart, plots[i].k[j], counter);
                counter = newCounter;
                rawDatasets.push({
                    label: subPlots[j].names ? subPlots[j].names[0] : `Series${i}`,
                    yAxisID,
                    type: plots[i].t,
                    subLabels,
                    subData
                });
            });
        });

        const { themeColors } = this.props;
        const datasets = _.map(rawDatasets, ({ label, type, subData, yAxisID }, index) => ({
            label,
            type,
            data: subData,
            lineTension: 0,
            fill: false,
            yAxisID,
            backgroundColor: type === 'line' ? themeColors[index] : themeColors,
            borderColor: type === 'line' ? themeColors[index] : 'white'
        }));

        const labels = !_.isEmpty(rawDatasets) ? rawDatasets[0].subLabels : [];

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

    render() {
        const { charts } = this.state;

        return (
            <div style={{ width: '100%', position: 'absolute', top: 0, left: 0 }}>
                {_.map(charts, (chart, idx) => {
                    const ChartType = chartTypeMap[chart.type];
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                left: chart.position.x + HEADER_WIDTH,
                                top: chart.position.y + HEADER_HEIGHT,
                                height: chart.height,
                                width: chart.width,
                                // border: '1px solid grey',
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
    }
}

export default Charts;
