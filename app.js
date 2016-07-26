var main = function() {
  /* Push the body and the nav over by 285px over */
  $('.icon-menu').click(function() {
    $('.selfPortrait').css('z-index',-1);
    $('.menu').animate({
      left: "0px"
    }, 200);

    $('body').animate({
      left: "0px"
    }, 200);
  });

  /* Then push them back */
  $('.icon-close').click(function() { 
    $('.menu').animate({
      left: "-285px"
    }, 200);

    $('body').animate({
      left: "0px"
    }, 200);
   $('.selfPortrait').css('z-index',0);
  }); 
};


$(document).ready(main);
