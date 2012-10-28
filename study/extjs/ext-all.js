/**
 * @author comahead
 */
/*
This file is part of Ext JS 4.1

Copyright (c) 2011-2012 Sencha Inc

Contact:  http://www.sencha.com/contact

GNU General Public License Usage
This file may be used under the terms of the GNU General Public License version 3.0 as
published by the Free Software Foundation and appearing in the file LICENSE included in the
packaging of this file.

Please review the following information to ensure the GNU General Public License version 3.0
requirements will be met: http://www.gnu.org/copyleft/gpl.html.

If you are unsure which license is appropriate for your use, please contact the sales department
at http://www.sencha.com/contact.

Build date: 2012-07-04 21:11:01 (65ff594cd80b9bad45df640c22cc0adb52c95a7b)
*/
/**
 * @class Ext
 * @singleton
 */
var Ext = Ext || {};
Ext._startTime = new Date().getTime();

/**
 * @comahewad
 * require(extjs.core.js)
 */

/*
 * This method evaluates the given code free of any local variable. In some browsers this
 * will be at global scope, in others it will be in a function.
 * @parma {String} code The code to evaluate.
 * @private
 * @method
 */
Ext.globalEval = Ext.global.execScript
    ? function(code) {
        execScript(code);
    }
    : function($$code) {
        // IMPORTANT: because we use eval we cannot place this in the above function or it
        // will break the compressor's ability to rename local variables...
        (function(){
            eval($$code);
        }());
    };

/**
 * @comahewad
 * require(extjs.version.js)
 */

/**
 * @comahead
 * require(extjs.string.js)
 */

/**
 * @comahead
 * require(extjs.number.js)
 */

/**
 * @comahead
 * require(extjs.array.js)
 */

/**
 * @comahead
 * require(extjs.function.js)
 */

/**
 * @comahead
 * require(extjs.object.js)
 */

/**
 * @comahead
 * require(extjs.date.js)
 */

/**
 * @comahead
 * require(extjs.base.js)
 */

/**
 * @comahead
 * require(extjs.class.js)
 */

/**
 * @comahead
 * require(extjs.classmanager.js)
 */

/**
 * @comahead
 * require(extjs.loader.js)
 */

/**
 * @comahead
 * require(extjs.error.js)
 */

/**
 * @comahead
 * require(extjs.json.js)
 */

/**
 * @comahead
 * require(extjs.ext.js)
 */

/**
 * Loads Ext.app.Application class and starts it up with given configuration after the page is ready.
 *
 * See Ext.app.Application for details.
 *
 * @param {Object} config
 */
Ext.application = function(config) {
    Ext.require('Ext.app.Application');

    Ext.onReady(function() {
        new Ext.app.Application(config);
    });
};

/**
 * @comahead
 * require(extjs.util.format.js)
 */


/**
 * @comahead
 * require(extjs.util.taskrunner.js)
 */

/**
 * @comahead
 * require(extjs.perf.accum.js)
 */


function () {
    Ext.perf.getTimestamp = this.getTimestamp;
});


/**
 * @comahead
 * require(extjs.perf.monitor.js)
 */

/**
 * @comahead
 * require(extjs.is.js)
 */


/**
 * @comahead
 * require(extjs.supports.js)
 */


/**
 * @comahead
 * require(extjs.util.relayedtask.js)
 */

/**
 * @comahead
 * require(extjs.eventmanager.js)
 */

/**
 * @comahead
 * require(extjs.dom.abstractquery.js)
 */

/**
 * @comahead
 * require(extjs.dom.abstracthelper.js)
 */

/**
 * @comahead
 * require(extjs.dom.abstractelement.js)
 */

/**
 * @comahead
 * require(extjs.domhelper.js)
 */

/**
 * @comahead
 * require(extjs.dom.query.js)
 */

/**
 * @comahead
 * require(extjs.dom.element.js)
 */

/**
 * @comahead
 * require(extjs.dom.compositeelement.js)
 */

/**
 * @comahead
 * require(extjs.abstractplugin.js)
 */

/**
 * @comahead
 * require(extjs.componentquery.js)
 */

/**
 * @comahead
 * require(extjs.template.js)
 */

/**
 * @comahead
 * require(extjs.chart.callout.js)
 */

/**
 * @comahead
 * require(extjs.chart.navgation.js)
 */

/**
 * @comahead
 * require(extjs.chart.sharp.js)
 */

/**
 * @comahead
 * require(extjs.data.idgenerator.js)
 */

/**
 * @comahead
 * require(extjs.data.jsonp.js)
 */

/**
 * @comahead
 * require(extjs.data.operation.js)
 */

/**
 * @comahead
 * require(extjs.data.request.js)
 */

/**
 * @comahead
 * require(extjs.data.resultset.js)
 */

/**
 * @comahead
 * require(extjs.data.seqidgenerator.js)
 */

/**
 * @comahead
 * require(extjs.data.sorttype.js)
 */

/**
 * @comahead
 * require(extjs.data.types.js)
 */

/**
 * @comahead
 * require(extjs.data.uuidgenertator.js)
 */

/**
 * @comahead
 * require(extjs.data.validations.js)
 */

/**
 * @comahead
 * require(extjs.data.associate.associate.js)
 */

/**
 * @comahead
 * require(extjs.data.associate.belongsto.js)
 */

/**
 * @comahead
 * require(extjs.data.associate.hasone.js)
 */

/**
 * @comahead
 * require(extjs.writer.writer.js)
 */

/**
 * @comahead
 * require(extjs.writer.xml.js)
 */

/**
 * @comahead
 * require(extjs.direct.remotemethod.js)
 */

/**
 * @comahead
 * require(extjs.direct.transaction.js)
 */

/**
 * @comahead
 * require(extjs.draw.color.js)
 */

/**
 * @comahead
 * require(extjs.draw.draw.js)
 */

/**
 * @comahead
 * require(extjs.draw.matrix.js)
 */

/**
 * @comahead
 * require(extjs.draw.engine.js)
 */

/**
 * @comahead
 * require(extjs.fx.js)
 */

/**
 * @comahead
 * require(extjs.layout.js)
 */

/**
 * @comahead
 * require(extjs.util.js)
 */

/**
 * @comahead
 * require(extjs.action.js)
 */

/**
 * @comahead
 * require(extjs.layer.js)
 */

/**
 * @comahead
 * require(extjs.shadowpool.js)
 */

/**
 * @comahead
 * require(extjs.zindexmanager.js)
 */

/**
 * @comahead
 * require(extjs.dragdrop.js)
 */

/**
 * @comahead
 * require(extjs.form.js)
 */

/**
 * @comahead
 * require(extjs.grid.js)
 */

/**
 * @comahead
 * require(extjs.layout.container.boxoverflow.js)
 */

/**
 * @comahead
 * require(extjs.panel.proxy.js)
 */


/**
 * @comahead
 * require(extjs.resizer.js)
 */

/**
 * @comahead
 * require(extjs.slider.thumb.js)
 */


/**
 * @comahead
 * require(extjs.tree.plugin.treeviewdd.js)
 */



/**
 * @comahead
 * require(extjs.util.js)
 */

/**
 * @comahead
 * require(extjs.elementloader.js)
 */

/**
 * @comahead
 * require(extjs.componentloader.js)
 */


/**
 * @comahead
 * require(extjs.xtemplate.js)
 */

/**
 * @comahead
 * require(extjs.app.controller.js)
 */

/**
 * @comahead
 * require(extjs.chart.js)
 */


/**
 * @comahead
 * require(extjs.data.js)
 */


/**
 * @comahead
 * require(extjs.ajax.js)
 */


/**
 * @comahead
 * require(extjs.data.js)
 */

/**
 * @comahead
 * require(extjs.direct.js)
 */

/**
 * @comahead
 * require(extjs.fx.js)
 */


/**
 * @comahead
 * require(extjs.layout.layout.js)
 */

/**
 * @comahead
 * require(extjs.layout.component.js)
 */

/**
 * @comahead
 * require(extjs.state.js)
 */

/**
 * @comahead
 * require(extjs.util.js)
 */

/**
 * @comahead
 * require(extjs.abstractmanager.js)
 */

/**
 * @comahead
 * require(extjs.componentmanager.js)
 */

/**
 * @comahead
 * require(extjs.abstractcomponent.js)
 */

/**
 * @comahead
 * require(extjs.modelmanager.js)
 */

/**
 * @comahead
 * require(extjs.pluginmanager.js)
 */


/**
 * @comahead
 * require(extjs.fx.js)
 */


/**
 * @comahead
 * require(extjs.util.js)
 */

/**
 * @comahead
 * require(extjs.container.dockingcontainer.js)
 */

/**
 * @comahead
 * require(extjs.data.js)
 */

/**
 * @comahead
 * require(extjs.direct.js)
 */

/**
 * @comahead
 * require(extjs.draw.js)
 */

/**
 * @comahead
 * require(extjs.chart.js)
 */

/**
 * @comahead
 * require(extjs.draw.js)
 */

/**
 * @comahead
 * require(extjs.fx.js)
 */


/**
 * @comahead
 * require(extjs.layout.js)
 */


/**
 * @comahead
 * require(extjs.selection.js)
 */

/**
 * @comahead
 * require(extjs.component.js)
 */

/**
 * @comahead
 * require(extjs.app.js)
 */


/**
 * @comahead
 * require(extjs.chart.js)
 */


/**
 * @comahead
 * require(extjs.draw.js)
 */


/**
 * @comahead
 * require(extjs.focusmanager.js)
 */


/**
 * @comahead
 * require(extjs.img.js)
 */

/**
 * @comahead
 * require(extjs.loadmask.js)
 */

/**
 * @comahead
 * require(extjs.view.js)
 */



/**
 * @comahead
 * require(extjs.shadow.js)
 */

/**
 * @comahead
 * require(extjs.dragdrop.js)
 */

/**
 * @comahead
 * require(extjs.draw.js)
 */

/**
 * @comahead
 * require(extjs.flash.js)
 */

/**
 * @comahead
 * require(extjs.form.js)
 */

/**
 * @comahead
 * require(extjs.grid.js)
 */

/**
 * @comahead
 * require(extjs.grid.js)
 */

/**
 * @comahead
 * require(extjs.layout.js)
 */


/**
 * @comahead
 * require(extjs.form.js)
 */

/**
 * @comahead
 * require(extjs.container.js)
 */

/**
 * @comahead
 * require(extjs.editor.js)
 */

/**
 * @comahead
 * require(extjs.menu.js)
 */

/**
 * @comahead
 * require(extjs.button.js)
 */

/**
 * @comahead
 * require(extjs.panel.js)
 */

/**
 * @comahead
 * require(extjs.picker.js)
 */

/**
 * @comahead
 * require(extjs.resizer.js)
 */


/**
 * @comahead
 * require(extjs.selection.js)
 */

/**
 * @comahead
 * require(extjs.tab.js)
 */

/**
 * @comahead
 * require(extjs.toolbar.js)
 */


/**
 * @comahead
 * require(extjs.grid.js)
 */

/**
 * @comahead
 * require(extjs.toolbar.js)
 */

/**
 * @comahead
 * require(extjs.tip.js)
 */


/**
 * @comahead
 * require(extjs.slider.js)
 */

/**
 * @comahead
 * require(extjs.window.js)
 */

/*
 * This file represents the very last stage of the Ext definition process and is ensured
 * to be included at the end of the build via the 'tail' package of extjs.jsb3.
 *
 */

Ext._endTime = new Date().getTime();
if (Ext._beforereadyhandler){
    Ext._beforereadyhandler();
}

