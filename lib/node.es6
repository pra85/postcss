import CssSyntaxError from './css-syntax-error';
import Stringifier    from './stringifier';
import stringify      from './stringify';
import warnOnce       from './warn-once';

let cloneNode = function (obj, parent) {
    let cloned = new obj.constructor();

    for ( let i in obj ) {
        if ( !obj.hasOwnProperty(i) ) continue;
        let value = obj[i];
        let type  = typeof value;

        if ( i === 'parent' && type === 'object' ) {
            if (parent) cloned[i] = parent;
        } else if ( i === 'source' ) {
            cloned[i] = value;
        } else if ( value instanceof Array ) {
            cloned[i] = value.map( j => cloneNode(j, cloned) );
        } else if ( i !== 'before'  && i !== 'after' &&
                    i !== 'between' && i !== 'semicolon' ) {
            if ( type === 'object' ) value = cloneNode(value);
            cloned[i] = value;
        }
    }

    return cloned;
};

export default class Node {

    raws = { };

    constructor(defaults = { }) {
        for ( let name in defaults ) {
            this[name] = defaults[name];
        }
    }

    error(message, opts = { }) {
        if ( this.source ) {
            let pos = this.positionBy(opts);
            return this.source.input.error(message, pos.line, pos.column, opts);
        } else {
            return new CssSyntaxError(message);
        }
    }

    warn(result, message) {
        return result.warn(message, { node: this });
    }

    remove() {
        if ( this.parent ) {
            this.parent.removeChild(this);
        }
        this.parent = undefined;
        return this;
    }

    toString(stringifier = stringify) {
        if ( stringifier.stringify ) stringifier = stringifier.stringify;
        let result  = '';
        stringifier(this, i => result += i );
        return result;
    }

    clone(overrides = { }) {
        let cloned = cloneNode(this);
        for ( let name in overrides ) {
            cloned[name] = overrides[name];
        }
        return cloned;
    }

    cloneBefore(overrides = { }) {
        let cloned = this.clone(overrides);
        this.parent.insertBefore(this, cloned);
        return cloned;
    }

    cloneAfter(overrides = { }) {
        let cloned = this.clone(overrides);
        this.parent.insertAfter(this, cloned);
        return cloned;
    }

    replaceWith(...nodes) {
        if (this.parent) {
            for (let node of nodes) {
                this.parent.insertBefore(this, node);
            }

            this.remove();
        }

        return this;
    }

    moveTo(container) {
        this.cleanRaws(this.root() === container.root());
        this.remove();
        container.append(this);
        return this;
    }

    moveBefore(node) {
        this.cleanRaws(this.root() === node.root());
        this.remove();
        node.parent.insertBefore(node, this);
        return this;
    }

    moveAfter(node) {
        this.cleanRaws(this.root() === node.root());
        this.remove();
        node.parent.insertAfter(node, this);
        return this;
    }

    next() {
        let index = this.parent.index(this);
        return this.parent.nodes[index + 1];
    }

    prev() {
        let index = this.parent.index(this);
        return this.parent.nodes[index - 1];
    }

    toJSON() {
        let fixed = { };

        for ( let name in this ) {
            if ( !this.hasOwnProperty(name) ) continue;
            if ( name === 'parent' ) continue;
            let value = this[name];

            if ( value instanceof Array ) {
                fixed[name] = value.map( (i) => {
                    if ( typeof i === 'object' && i.toJSON ) {
                        return i.toJSON();
                    } else {
                        return i;
                    }
                });
            } else if ( typeof value === 'object' && value.toJSON ) {
                fixed[name] = value.toJSON();
            } else {
                fixed[name] = value;
            }
        }

        return fixed;
    }

    raw(own, detect) {
        let str = new Stringifier();
        return str.raw(this, own, detect);
    }

    root() {
        let result = this;
        while ( result.parent ) result = result.parent;
        return result;
    }

    cleanRaws(keepBetween) {
        delete this.raws.before;
        delete this.raws.after;
        if ( !keepBetween ) delete this.raws.between;
    }

    positionInside(index) {
        let string = this.toString();
        let column = this.source.start.column;
        let line   = this.source.start.line;

        for ( let i = 0; i < index; i++ ) {
            if ( string[i] === '\n' ) {
                column = 1;
                line  += 1;
            } else {
                column += 1;
            }
        }

        return { line, column };
    }

    positionBy(opts) {
        let pos = this.source.start;
        if ( opts.index ) {
            pos = this.positionInside(opts.index);
        } else if ( opts.word ) {
            let index = this.toString().indexOf(opts.word);
            if ( index !== -1 ) pos = this.positionInside(index);
        }
        return pos;
    }

    /* istanbul ignore next */
    removeSelf() {
        warnOnce('Node#removeSelf is deprecated. Use Node#remove.');
        return this.remove();
    }

    /* istanbul ignore next */
    replace(nodes) {
        warnOnce('Node#replace is deprecated. Use Node#replaceWith');
        return this.replaceWith(nodes);
    }

    /* istanbul ignore next */
    style(own, detect) {
        warnOnce('Node#style() is deprecated. Use Node#raw()');
        return this.raw(own, detect);
    }

    /* istanbul ignore next */
    cleanStyles(keepBetween) {
        warnOnce('Node#cleanStyles() is deprecated. Use Node#cleanRaws()');
        return this.cleanRaws(keepBetween);
    }

    /* istanbul ignore next */
    get before() {
        warnOnce('Node#before is deprecated. Use Node#raws.before');
        return this.raws.before;
    }

    /* istanbul ignore next */
    set before(val) {
        warnOnce('Node#before is deprecated. Use Node#raws.before');
        this.raws.before = val;
    }

    /* istanbul ignore next */
    get between() {
        warnOnce('Node#between is deprecated. Use Node#raws.between');
        return this.raws.between;
    }

    /* istanbul ignore next */
    set between(val) {
        warnOnce('Node#between is deprecated. Use Node#raws.between');
        this.raws.between = val;
    }

}
