/*eslint max-nested-callbacks: [2, 4]*/

/*global clearInterval: false, clearTimeout: false, document: false, event: false, frames: false, history: false, Image: false, location: false, name: false, navigator: false, Option: false, parent: false, screen: false, setInterval: false, setTimeout: false, window: false, XMLHttpRequest: false, FormData: false */
/*global sColumn, pColumn, vColumn, cColumn, travelerLinkColumn, aliasColumn, workProgressColumn, ownerColumn, deviceTagColumn, manPowerColumn, sDomNoTools*/
/*global ajax401: false, updateAjaxURL: false, disableAjaxCache: false, prefix: false, Holder*/


$(function () {
  updateAjaxURL(prefix);
  ajax401(prefix);
  disableAjaxCache();

  var workAoColumns = [travelerLinkColumn, sColumn, pColumn, vColumn, cColumn, statusColumn,aliasColumn, ownerColumn, deviceTagColumn, manPowerColumn, workProgressColumn];

  var worksTable = $('#work-table').dataTable({
    sAjaxSource: './works/json',
    sAjaxDataProp: '',
    bAutoWidth: false,
    bPaginate: false,
    iDisplayLength: 10,
    aLengthMenu: [
      [10, -1],
      [10, 'All']
    ],
    oLanguage: {
      sLoadingRecords: 'Please wait - loading data from the server ...'
    },
    bDeferRender: true,
    aoColumns: workAoColumns,
    fnInitComplete: function () {
      Holder.run({
        images: 'img.user'
      });
    },
    aaSorting: [
      [1, 'asc'],
      [2, 'asc']
    ],
    sDom: sDomNoTools
  });
  fnAddFilterFoot('#work-table', workAoColumns);
  filterEvent();

  $('#sort').click(function () {
    worksTable.fnSort([
      [1, 'asc'],
      [2, 'asc']
    ]);
  });

  // do action and set hash
  $('#hide-completed').on('click', function () {
    worksTable.DataTable().column(5).search('[^completed]', true, true).draw();
    window.history.pushState(null, null, this.baseURI + $(this).attr('href'));
  });

  $('#show-completed').on('click', function () {
    worksTable.DataTable().column(5).search('').draw();
    window.history.pushState(null, '', this.baseURI + $(this).attr('href'));
  });

  // back and foward button
  window.onhashchange = function () {
    if (window.location.hash === '#hide-completed') {
      worksTable.DataTable().column(5).search('[^completed]', true, true).draw();
    }else if(window.location.hash === '#show-completed' || window.location.hash === '') {
      worksTable.DataTable().column(5).search('').draw();
    }
  };

  // show content by hash url
  if (window.location.hash === '#hide-completed') {
    worksTable.DataTable().column(5).search('[^completed]', true, true).draw();
  }

});
