import React, { Component } from 'react';
import _ from 'lodash';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import XLSX from 'xlsx';
import { HEADER_WIDTH, HEADER_HEIGHT } from './const';

class Charts extends Component {
    constructor(props) {
        super(props);

        this.state = {
            charts: _.map(this.props.sheet['!charts'], this._parseChart)
        };
    }

    _getRawData = (chart, subPlot, counter) => {
        const { e } = XLSX.utils.decode_range(chart['!ref']);
        const rowCount = e.r + 1;
        let subLabels = [];
        const subData = [];
        for (const k in subPlot) {
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
            counter += 1;
        }
        if (_.isEmpty(subLabels)) subLabels = _.range(1, subData.length + 1);

        return { subLabels, subData, newCounter: counter };
    };

    _displayAxes = (type) => {
        return !(type === 'pie' || type === 'doughnut');
    };

    _parseChart = (chart) => {
        const type = chart['!plot'][0].t;
        const position = chart['!pos'];
        let title = chart['!title'];
        const legendPos = chart['!legend']
            ? legendMap[chart['!legend'].pos]
            : null;
        let counter = 0;

        const rawDatasets = [];
        const yAxes = [];
        const plots = chart['!plot'];
        let subPlots = [];
        for (const i in plots) {
            subPlots = plots[i].ser;
            const yAxisID = subPlots[0].names
                ? subPlots[0].names[0]
                : `Series${i}`;
            if (!title && subPlots[0].names) title = yAxisID;
            yAxes.push({
                display: this._displayAxes(type),
                id: yAxisID,
                type: 'linear',
                position: _.isEmpty(yAxes) ? 'left' : 'right',
                ticks: {
                    beginAtZero: true
                }
            });
            for (const j in subPlots) {
                const { subLabels, subData, newCounter } = this._getRawData(
                    chart,
                    plots[i].k[j],
                    counter
                );
                counter = newCounter;
                rawDatasets.push({
                    label: subPlots[j].names
                        ? subPlots[j].names[0]
                        : `Series${i}`,
                    yAxisID,
                    type: plots[i].t,
                    subLabels,
                    subData
                });
            }
        }

        const { themeColors } = this.props;
        const datasets = _.map(
            rawDatasets,
            ({ label, type, subData, yAxisID }, index) => ({
                label,
                type,
                data: subData,
                lineTension: 0,
                fill: false,
                yAxisID,
                backgroundColor:
                    type === 'line' ? themeColors[index] : themeColors,
                borderColor: type === 'line' ? themeColors[index] : 'white'
            })
        );

        const labels = !_.isEmpty(rawDatasets) ? rawDatasets[0].subLabels : [];

        return {
            type,
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
                            display: this._displayAxes(type),
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
            <div
                style={{ width: '100%', position: 'absolute', top: 0, left: 0 }}
            >
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

const chartTypeMap = {
    line: Bar,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut
};

const legendMap = {
    b: 'bottom'
};

export default Charts;
