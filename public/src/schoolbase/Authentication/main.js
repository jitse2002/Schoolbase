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
    events: {
        'click #login': 'checkLogin'
    },
    initialize: function () {

        this.$el.append(tpl());
    },
    checkLogin: function () {

        var username = $('#username').val();
        var password = $('#password').val();
        var token = null;//Todo: Token systeem bouwen

        $.ajax({

            url: '/auth/login/validate',
            type: 'post',
            data: {username:username,password:password,token:token},
            success: function(data){

                if(data.error)
                    alert(data.error.msg);
                else if(data.success)
                    $(location).attr('href','/');
                else
                    alert('Unknown error!');

                console.log(data);

            }

        });

    }

});

new baseView();