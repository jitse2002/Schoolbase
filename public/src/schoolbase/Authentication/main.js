/*
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 25/10/18 18:17
 */

import $ from "jquery";
import Backbone from "backbone";
import tpl from "./html/base.stache";

import "css/core.less";

var baseView = Backbone.View.extend({

    el: '#app',
    initialize: function () {

        this.$el.append(tpl());
    }

});

new baseView();