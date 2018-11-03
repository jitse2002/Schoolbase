/*
 * A project created by Jitsedev.be
 *
 * Author: Jitse Taels <jitse@jitsedev.be>
 * Date: 1/11/18 12:04
 */

function openTab(id){

    //1: Create group //2 view group //3 edit group

    if(id == 1){

    }else if(id == 2){

    }else if(id == 3){}

}

function openGroup(groupID) {

    Schoolbase.groupID = groupID;

    $('#load-users').html(" ");

    function loadAllUsers(groupID) {

        return $.ajax({

            url: '/usermanagement/rest/v1/groups/members/groupID:' + Schoolbase.groupID,
            type: 'GET',
            success: function (data) {

                for (a = 0; a < data.length; a++) {

                    $('#load-users').append('<div class="user-label"> <div id="username">' + data[a].username + '</div> <div class="editmode"> <li class="fa fa-pencil"></li> <li class="fa fa-info-circle"></li> <li class="fa fa-trash"></li> </div> </div>')

                }

            }

        });


    }

    $.when(loadAllUsers()).done(function (user) {

    });

}