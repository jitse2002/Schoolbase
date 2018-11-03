/*
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 1/11/18 12:03
 */

var filetree;

function loadTree() {

    //Loads the filetree
    return $.ajax({

        url: '/usermanagement/rest/v1/groups/buildtree',
        type: 'get',
        success: function (data) {

            var keys = Object.keys(data);

            fileTree = data;

            for(a = 0; a < keys.length; a++){

                var groupKey = eval("data." + keys[a]);

                if(!groupKey.isChild){

                    $('#groups').append('<li id="'+groupKey.name+'" groupID="'+groupKey.id+'" isChild="'+groupKey.isChild+'">'+groupKey.name+' <ul id="'+groupKey.name+'_append"></ul></li>');

                }

                for(b = 0; b < groupKey.children.length; b++){

                    var key = eval("data." + groupKey.children[b]);

                    $('#'+groupKey.name+'_append').append('<li id="'+key.name+'" groupID="'+key.id+'" isChild="'+key.isChild+'"> '+key.name+'</li>');

                }

            }

            filetree = data;

        }

    });

}

$(function() {

    $.when(loadTree()).done(function (tree) {

        $('#tree').jstree({

        });

        $('#tree').on("changed.jstree", function (e, data) {

            openGroup(data.node.li_attr.groupid);

        });

    });

});
