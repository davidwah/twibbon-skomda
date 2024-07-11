
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let article;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let hr0;
    	let t3;
    	let p0;
    	let t4;
    	let strong0;
    	let t6;
    	let t7;
    	let div4;
    	let p1;
    	let canvas0;
    	let t8;
    	let p2;
    	let label0;
    	let t10;
    	let input0;
    	let t11;
    	let div2;
    	let div0;
    	let label1;
    	let t12;
    	let span0;
    	let t13;
    	let t14;
    	let input1;
    	let t15;
    	let div1;
    	let label2;
    	let t16;
    	let span1;
    	let t18;
    	let t19;
    	let input2;
    	let t20;
    	let p3;
    	let button0;
    	let t22;
    	let button1;
    	let t24;
    	let div3;
    	let a;
    	let t26;
    	let h3;
    	let t28;
    	let hr1;
    	let t29;
    	let h20;
    	let t31;
    	let p4;
    	let t32;
    	let strong1;
    	let t34;
    	let t35;
    	let h21;
    	let t37;
    	let p5;
    	let t39;
    	let h22;
    	let t41;
    	let p6;
    	let t42;
    	let strong2;
    	let t44;
    	let strong3;
    	let t46;
    	let t47;
    	let p7;
    	let t49;
    	let p8;
    	let button2;
    	let t51;
    	let p9;
    	let small;
    	let strong4;
    	let t53;
    	let t54;
    	let div18;
    	let div5;
    	let canvas1;
    	let t55;
    	let div8;
    	let div6;
    	let input3;
    	let t56;
    	let div7;
    	let input4;
    	let t57;
    	let div11;
    	let div9;
    	let label3;
    	let t59;
    	let input5;
    	let t60;
    	let div10;
    	let label4;
    	let t62;
    	let input6;
    	let t63;
    	let div14;
    	let div12;
    	let label5;
    	let t65;
    	let input7;
    	let t66;
    	let div13;
    	let label6;
    	let t68;
    	let input8;
    	let t69;
    	let div17;
    	let div16;
    	let div15;
    	let t71;
    	let div27;
    	let div19;
    	let t73;
    	let div24;
    	let div21;
    	let div20;
    	let t75;
    	let div23;
    	let div22;
    	let t77;
    	let div26;
    	let div25;
    	let t79;
    	let p10;
    	let t80;
    	let p11;
    	let t81;
    	let span2;
    	let em;
    	let t83;

    	const block = {
    		c: function create() {
    			article = element("article");
    			h1 = element("h1");
    			t0 = text("MPLS ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = space();
    			hr0 = element("hr");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("You can use this web app to celebrate ");
    			strong0 = element("strong");
    			strong0.textContent = "MPLS SKOMDA 2024";
    			t6 = text(" support to your profile picture.");
    			t7 = space();
    			div4 = element("div");
    			p1 = element("p");
    			canvas0 = element("canvas");
    			t8 = space();
    			p2 = element("p");
    			label0 = element("label");
    			label0.textContent = "Select or Upload file.";
    			t10 = space();
    			input0 = element("input");
    			t11 = space();
    			div2 = element("div");
    			div0 = element("div");
    			label1 = element("label");
    			t12 = text("Zoom (");
    			span0 = element("span");
    			t13 = text(") :");
    			t14 = space();
    			input1 = element("input");
    			t15 = space();
    			div1 = element("div");
    			label2 = element("label");
    			t16 = text("Filter (");
    			span1 = element("span");
    			span1.textContent = "0.5";
    			t18 = text(") :");
    			t19 = space();
    			input2 = element("input");
    			t20 = space();
    			p3 = element("p");
    			button0 = element("button");
    			button0.textContent = "Download";
    			t22 = space();
    			button1 = element("button");
    			button1.textContent = "Tutorial";
    			t24 = space();
    			div3 = element("div");
    			a = element("a");
    			a.textContent = "x";
    			t26 = space();
    			h3 = element("h3");
    			h3.textContent = "Tutorial:";
    			t28 = space();
    			hr1 = element("hr");
    			t29 = space();
    			h20 = element("h2");
    			h20.textContent = "Upload Your Photo";
    			t31 = space();
    			p4 = element("p");
    			t32 = text("Start the transformation quickly by uploading a photo of your choice\r\n        using the ");
    			strong1 = element("strong");
    			strong1.textContent = "select or upload photo ";
    			t34 = text("button.");
    			t35 = space();
    			h21 = element("h2");
    			h21.textContent = "Zoom and Filters";
    			t37 = space();
    			p5 = element("p");
    			p5.textContent = "Fit your image appropriately in #SKOMDA frame. Our editor lets you\r\n        crop and position easily, ensuring your profile picture perfectly\r\n        reflects your style and message.";
    			t39 = space();
    			h22 = element("h2");
    			h22.textContent = "Download Your Profile Photo";
    			t41 = space();
    			p6 = element("p");
    			t42 = text("It's time to use your new profile picture! Just press the ");
    			strong2 = element("strong");
    			strong2.textContent = "Download";
    			t44 = text(" \r\n        button of the photo you created to save it instantly. Share your support\r\n        for ");
    			strong3 = element("strong");
    			strong3.textContent = "MPLS SKOMDA";
    			t46 = text(" with your unique profile photo.");
    			t47 = space();
    			p7 = element("p");
    			p7.textContent = "Was this answer useful to you?";
    			t49 = space();
    			p8 = element("p");
    			button2 = element("button");
    			button2.textContent = "Yes";
    			t51 = space();
    			p9 = element("p");
    			small = element("small");
    			strong4 = element("strong");
    			strong4.textContent = "Note:";
    			t53 = text(" This app runs purely in your browser. No images or\r\n        data will be saved by the app.");
    			t54 = space();
    			div18 = element("div");
    			div5 = element("div");
    			canvas1 = element("canvas");
    			t55 = space();
    			div8 = element("div");
    			div6 = element("div");
    			input3 = element("input");
    			t56 = space();
    			div7 = element("div");
    			input4 = element("input");
    			t57 = space();
    			div11 = element("div");
    			div9 = element("div");
    			label3 = element("label");
    			label3.textContent = "Zoom";
    			t59 = space();
    			input5 = element("input");
    			t60 = space();
    			div10 = element("div");
    			label4 = element("label");
    			label4.textContent = "Zoom";
    			t62 = space();
    			input6 = element("input");
    			t63 = space();
    			div14 = element("div");
    			div12 = element("div");
    			label5 = element("label");
    			label5.textContent = "Filter";
    			t65 = space();
    			input7 = element("input");
    			t66 = space();
    			div13 = element("div");
    			label6 = element("label");
    			label6.textContent = "Filter";
    			t68 = space();
    			input8 = element("input");
    			t69 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div15.textContent = "Unduh";
    			t71 = space();
    			div27 = element("div");
    			div19 = element("div");
    			div19.textContent = "...";
    			t73 = space();
    			div24 = element("div");
    			div21 = element("div");
    			div20 = element("div");
    			div20.textContent = "...";
    			t75 = space();
    			div23 = element("div");
    			div22 = element("div");
    			div22.textContent = "...";
    			t77 = space();
    			div26 = element("div");
    			div25 = element("div");
    			div25.textContent = "...";
    			t79 = space();
    			p10 = element("p");
    			t80 = space();
    			p11 = element("p");
    			t81 = text("Share this Twibbon on your social media2: ");
    			span2 = element("span");
    			em = element("em");
    			em.textContent = "Share?";
    			t83 = text(".");
    			add_location(h1, file, 5, 2, 56);
    			add_location(hr0, file, 6, 2, 80);
    			add_location(strong0, file, 8, 42, 137);
    			add_location(p0, file, 7, 2, 90);
    			add_location(canvas0, file, 12, 7, 241);
    			add_location(p1, file, 12, 4, 238);
    			attr_dev(label0, "class", "dropbox");
    			attr_dev(label0, "for", "full-img");
    			set_style(label0, "text-align", "center");
    			add_location(label0, file, 15, 6, 281);
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "id", "full-img");
    			attr_dev(input0, "accept", "image/*");
    			attr_dev(input0, "aria-label", "Select the picture you want to use");
    			input0.hidden = true;
    			add_location(input0, file, 17, 6, 395);
    			add_location(p2, file, 14, 4, 270);
    			attr_dev(span0, "id", "fz");
    			add_location(span0, file, 28, 37, 656);
    			attr_dev(label1, "for", "full-zoom");
    			add_location(label1, file, 28, 8, 627);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "id", "full-zoom");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "2");
    			attr_dev(input1, "step", "0.01");
    			input1.value = "1";
    			add_location(input1, file, 29, 8, 698);
    			attr_dev(div0, "class", "column");
    			add_location(div0, file, 27, 6, 597);
    			attr_dev(span1, "id", "fa");
    			add_location(span1, file, 39, 40, 932);
    			attr_dev(label2, "for", "full-alpha");
    			add_location(label2, file, 39, 8, 900);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "id", "full-alpha");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "max", "1");
    			attr_dev(input2, "step", "0.01");
    			input2.value = "0.5";
    			add_location(input2, file, 40, 8, 977);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file, 38, 6, 870);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file, 26, 4, 572);
    			attr_dev(button0, "id", "click");
    			attr_dev(button0, "class", "save myth");
    			button0.disabled = true;
    			add_location(button0, file, 52, 6, 1175);
    			attr_dev(button1, "data-modal", "#modal2");
    			add_location(button1, file, 53, 6, 1246);
    			add_location(p3, file, 51, 4, 1164);
    			attr_dev(a, "class", "close");
    			attr_dev(a, "data-modal-close", "");
    			attr_dev(a, "href", "#");
    			add_location(a, file, 57, 6, 1380);
    			add_location(h3, file, 58, 6, 1436);
    			add_location(hr1, file, 59, 6, 1462);
    			add_location(h20, file, 60, 6, 1476);
    			add_location(strong1, file, 63, 18, 1611);
    			add_location(p4, file, 61, 6, 1510);
    			add_location(h21, file, 66, 6, 1680);
    			add_location(p5, file, 67, 6, 1713);
    			add_location(h22, file, 73, 6, 1931);
    			add_location(strong2, file, 75, 66, 2046);
    			add_location(strong3, file, 77, 12, 2168);
    			add_location(p6, file, 74, 6, 1975);
    			add_location(p7, file, 80, 6, 2250);
    			attr_dev(button2, "data-modal-close", "");
    			add_location(button2, file, 83, 8, 2310);
    			add_location(p8, file, 82, 6, 2297);
    			attr_dev(div3, "class", "modal modal-medium");
    			attr_dev(div3, "data-modal-window", "");
    			attr_dev(div3, "id", "modal2");
    			add_location(div3, file, 56, 4, 1310);
    			add_location(strong4, file, 90, 8, 2462);
    			add_location(small, file, 89, 6, 2445);
    			add_location(p9, file, 88, 4, 2434);
    			attr_dev(div4, "id", "full");
    			add_location(div4, file, 11, 2, 217);
    			add_location(canvas1, file, 98, 6, 2700);
    			attr_dev(div5, "class", "canvas-container");
    			add_location(div5, file, 97, 4, 2662);
    			attr_dev(input3, "type", "file");
    			attr_dev(input3, "id", "divide-left-img");
    			attr_dev(input3, "accept", "image/*");
    			add_location(input3, file, 102, 8, 2795);
    			attr_dev(div6, "class", "left");
    			add_location(div6, file, 101, 6, 2767);
    			attr_dev(input4, "type", "file");
    			attr_dev(input4, "id", "divide-right-img");
    			attr_dev(input4, "accept", "image/*");
    			add_location(input4, file, 105, 8, 2905);
    			attr_dev(div7, "class", "right");
    			add_location(div7, file, 104, 6, 2876);
    			attr_dev(div8, "class", "form-group");
    			add_location(div8, file, 100, 4, 2735);
    			attr_dev(label3, "for", "divide-left-zoom");
    			add_location(label3, file, 110, 8, 3057);
    			attr_dev(input5, "type", "range");
    			attr_dev(input5, "id", "divide-left-zoom");
    			attr_dev(input5, "min", "0");
    			attr_dev(input5, "max", "1");
    			attr_dev(input5, "step", "0.01");
    			input5.value = "1";
    			add_location(input5, file, 111, 8, 3109);
    			attr_dev(div9, "class", "left");
    			add_location(div9, file, 109, 6, 3029);
    			attr_dev(label4, "for", "divide-right-zoom");
    			add_location(label4, file, 121, 8, 3317);
    			attr_dev(input6, "type", "range");
    			attr_dev(input6, "id", "divide-right-zoom");
    			attr_dev(input6, "min", "0");
    			attr_dev(input6, "max", "1");
    			attr_dev(input6, "step", "0.01");
    			input6.value = "1";
    			add_location(input6, file, 122, 8, 3370);
    			attr_dev(div10, "class", "right");
    			add_location(div10, file, 120, 6, 3288);
    			attr_dev(div11, "class", "form-group");
    			add_location(div11, file, 108, 4, 2997);
    			attr_dev(label5, "for", "divide-left-alpha");
    			add_location(label5, file, 134, 8, 3620);
    			attr_dev(input7, "type", "range");
    			attr_dev(input7, "id", "divide-left-alpha");
    			attr_dev(input7, "min", "0");
    			attr_dev(input7, "max", "1");
    			attr_dev(input7, "step", "0.01");
    			input7.value = "0.5";
    			add_location(input7, file, 135, 8, 3675);
    			attr_dev(div12, "class", "left");
    			add_location(div12, file, 133, 6, 3592);
    			attr_dev(label6, "for", "divide-right-alpha");
    			add_location(label6, file, 145, 8, 3886);
    			attr_dev(input8, "type", "range");
    			attr_dev(input8, "id", "divide-right-alpha");
    			attr_dev(input8, "min", "0");
    			attr_dev(input8, "max", "1");
    			attr_dev(input8, "step", "0.01");
    			input8.value = "0.5";
    			add_location(input8, file, 146, 8, 3942);
    			attr_dev(div13, "class", "right");
    			add_location(div13, file, 144, 6, 3857);
    			attr_dev(div14, "class", "form-group");
    			add_location(div14, file, 132, 4, 3560);
    			add_location(div15, file, 158, 8, 4200);
    			attr_dev(div16, "class", "save myth");
    			add_location(div16, file, 157, 6, 4167);
    			attr_dev(div17, "class", "form-group");
    			add_location(div17, file, 156, 4, 4135);
    			attr_dev(div18, "id", "divide");
    			set_style(div18, "display", "none");
    			add_location(div18, file, 96, 2, 2617);
    			attr_dev(div19, "id", "choose");
    			add_location(div19, file, 164, 4, 4302);
    			add_location(div20, file, 167, 8, 4404);
    			attr_dev(div21, "id", "choice-full");
    			attr_dev(div21, "class", "myth");
    			add_location(div21, file, 166, 6, 4359);
    			add_location(div22, file, 170, 8, 4487);
    			attr_dev(div23, "id", "choice-divide");
    			attr_dev(div23, "class", "myth");
    			add_location(div23, file, 169, 6, 4440);
    			attr_dev(div24, "id", "choice");
    			add_location(div24, file, 165, 4, 4334);
    			add_location(div25, file, 174, 6, 4577);
    			attr_dev(div26, "id", "return-intro");
    			attr_dev(div26, "class", "myth");
    			add_location(div26, file, 173, 4, 4533);
    			attr_dev(div27, "id", "intro");
    			set_style(div27, "display", "none");
    			add_location(div27, file, 163, 2, 4258);
    			attr_dev(p10, "class", "result");
    			add_location(p10, file, 178, 2, 4619);
    			attr_dev(em, "class", "svelte-n98e8d");
    			add_location(em, file, 179, 53, 4696);
    			add_location(span2, file, 179, 47, 4690);
    			add_location(p11, file, 179, 2, 4645);
    			attr_dev(article, "class", "svelte-n98e8d");
    			add_location(article, file, 4, 0, 43);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(article, t2);
    			append_dev(article, hr0);
    			append_dev(article, t3);
    			append_dev(article, p0);
    			append_dev(p0, t4);
    			append_dev(p0, strong0);
    			append_dev(p0, t6);
    			append_dev(article, t7);
    			append_dev(article, div4);
    			append_dev(div4, p1);
    			append_dev(p1, canvas0);
    			append_dev(div4, t8);
    			append_dev(div4, p2);
    			append_dev(p2, label0);
    			append_dev(p2, t10);
    			append_dev(p2, input0);
    			append_dev(div4, t11);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, label1);
    			append_dev(label1, t12);
    			append_dev(label1, span0);
    			append_dev(label1, t13);
    			append_dev(div0, t14);
    			append_dev(div0, input1);
    			append_dev(div2, t15);
    			append_dev(div2, div1);
    			append_dev(div1, label2);
    			append_dev(label2, t16);
    			append_dev(label2, span1);
    			append_dev(label2, t18);
    			append_dev(div1, t19);
    			append_dev(div1, input2);
    			append_dev(div4, t20);
    			append_dev(div4, p3);
    			append_dev(p3, button0);
    			append_dev(p3, t22);
    			append_dev(p3, button1);
    			append_dev(div4, t24);
    			append_dev(div4, div3);
    			append_dev(div3, a);
    			append_dev(div3, t26);
    			append_dev(div3, h3);
    			append_dev(div3, t28);
    			append_dev(div3, hr1);
    			append_dev(div3, t29);
    			append_dev(div3, h20);
    			append_dev(div3, t31);
    			append_dev(div3, p4);
    			append_dev(p4, t32);
    			append_dev(p4, strong1);
    			append_dev(p4, t34);
    			append_dev(div3, t35);
    			append_dev(div3, h21);
    			append_dev(div3, t37);
    			append_dev(div3, p5);
    			append_dev(div3, t39);
    			append_dev(div3, h22);
    			append_dev(div3, t41);
    			append_dev(div3, p6);
    			append_dev(p6, t42);
    			append_dev(p6, strong2);
    			append_dev(p6, t44);
    			append_dev(p6, strong3);
    			append_dev(p6, t46);
    			append_dev(div3, t47);
    			append_dev(div3, p7);
    			append_dev(div3, t49);
    			append_dev(div3, p8);
    			append_dev(p8, button2);
    			append_dev(div4, t51);
    			append_dev(div4, p9);
    			append_dev(p9, small);
    			append_dev(small, strong4);
    			append_dev(small, t53);
    			append_dev(article, t54);
    			append_dev(article, div18);
    			append_dev(div18, div5);
    			append_dev(div5, canvas1);
    			append_dev(div18, t55);
    			append_dev(div18, div8);
    			append_dev(div8, div6);
    			append_dev(div6, input3);
    			append_dev(div8, t56);
    			append_dev(div8, div7);
    			append_dev(div7, input4);
    			append_dev(div18, t57);
    			append_dev(div18, div11);
    			append_dev(div11, div9);
    			append_dev(div9, label3);
    			append_dev(div9, t59);
    			append_dev(div9, input5);
    			append_dev(div11, t60);
    			append_dev(div11, div10);
    			append_dev(div10, label4);
    			append_dev(div10, t62);
    			append_dev(div10, input6);
    			append_dev(div18, t63);
    			append_dev(div18, div14);
    			append_dev(div14, div12);
    			append_dev(div12, label5);
    			append_dev(div12, t65);
    			append_dev(div12, input7);
    			append_dev(div14, t66);
    			append_dev(div14, div13);
    			append_dev(div13, label6);
    			append_dev(div13, t68);
    			append_dev(div13, input8);
    			append_dev(div18, t69);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(article, t71);
    			append_dev(article, div27);
    			append_dev(div27, div19);
    			append_dev(div27, t73);
    			append_dev(div27, div24);
    			append_dev(div24, div21);
    			append_dev(div21, div20);
    			append_dev(div24, t75);
    			append_dev(div24, div23);
    			append_dev(div23, div22);
    			append_dev(div27, t77);
    			append_dev(div27, div26);
    			append_dev(div26, div25);
    			append_dev(article, t79);
    			append_dev(article, p10);
    			append_dev(article, t80);
    			append_dev(article, p11);
    			append_dev(p11, t81);
    			append_dev(p11, span2);
    			append_dev(span2, em);
    			append_dev(p11, t83);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (name === undefined && !('name' in $$props || $$self.$$.bound[$$self.$$.props['name']])) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	});

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: '#SKOMDA 2024'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
