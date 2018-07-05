import React, { Component } from 'react';
import _ from 'lodash';
import LoadingIndicator from 'box-react-ui/lib/components/loading-indicator';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            workbook: null
        };
    }

    componentWillMount() {
        /* eslint-disable */
        var fileReader = new FileReader();
        fileReader.readAsArrayBuffer(this.props.data);
        fileReader._parseBuffer = this._parseBuffer;
        fileReader.onload = function() {
            this._parseBuffer(this.result);
        };
        /* eslint-enable */
    }

    _parseBuffer = (buffer) => {};

    render() {
        const { workbook } = this.state;
        return _.isEmpty(workbook) ? <LoadingIndicator /> : <div>hello world</div>;
    }
}

export default App;
