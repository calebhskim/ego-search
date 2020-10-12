// const jsonp = require('jsonp');
const xml2js = require('xml2js');
const get = require('lodash/get');

// ?output=toolbar&gl=us&hl=en&q=apple
const SEARCH_URL = 'https://suggestqueries.google.com/complete/search';
const CALLBACK_PREFIX = 'handleResults';

const parser = new xml2js.Parser();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

if (window) {
  window.jsonp_count = 0;
}

const jsonp = url  => {
  console.log('URL', url);
  let isCancelled = false;
  let scriptTag = null;
  let resolveDownload = null;
  const callback =  `${CALLBACK_PREFIX}_${window.jsonp_count++}`;
  window[callback] = res => {
    console.log('cb res', res);
    if (isCancelled) {
      dispose();
      return;
    }

    console.log(res);
    resolveDownload(res);
    dispose();
  };

  const dispose = () => {
    if (scriptTag) {
      document.head.removeChild(scriptTag);
      scriptTag = null;
    }

    if (resolveDownload) {
      resolveDownload = null;
    }

    delete window[callback];
  };

  const cancelable = new Promise((resolve, reject) => {
    resolveDownload = resolve;
    scriptTag = document.createElement('script');
    scriptTag.src = `${url}&callback=${callback}`;
    scriptTag.onerror = reject;
    document.head.appendChild(scriptTag);
  });

  cancelable.cancel = () => {
    isCancelled = true
  };

  return cancelable;
};

const getSuggestions = async query => {
  const result = new Promise((resolve, reject) => {
    try {
      const url = new URL(SEARCH_URL);
      // const callbackName = PREFIX + window.callbackCount;
      // window[callbackName] = res => {
      //   console.log('RES', res);
      // };

      url.searchParams.append('output', 'toolbar');
      url.searchParams.append('gl', 'us');
      url.searchParams.append('hl', 'en');
      url.searchParams.append('q', query);
      jsonp(url.href)
        .then(res => {
          console.log('json res', res);
          resolve(res);
        })
        .catch(err => {
          console.log('json err', err);
          reject(err);
        });
      //jsonp(url.href, { prefix: PREFIX, timeout: 1000 }, (err, res) => {
      //  window.callbackCount += 1;

      //  if (err) {
      //    console.log('JSONP', err);
      //    reject(err);
      //  }

      //  if (res && res.data) {
      //    parser.parseStringPromise(res.data)
      //      .then(result => resolve(result))
      //      .catch(err => {
      //        console.log('Error parsing XML:', err);
      //        reject(err);
      //      });
      //  }

      //  reject(err);
      // });
    } catch (err) {
      console.log('Error fetching suggestions:', err);
      reject(err);
    }
  });

  return result;
};

/*
  Parse term out of 'suggestion'. Filter out bad results:
  - suggestion only contains one 'vs'
  - suggestion does not contain root search term from this iteration
  - suggestion does not contain any previously accepted terms
  Add new terms to queue.
*/ 
const process = (suggestion, seen, queue, comparator, rank, matrix, level, group) => {
  const terms = suggestion.split(comparator);

  // Suggestion should only contain one 'vs'
  if (terms.length === 2) {
    const source = terms[0].trim();
    const target = terms[1].trim();

    if (target && !(target in seen)) {
      seen[target] = true;
      queue.push(target);
      matrix.push({ source, target, rank, level, group, });
    }
  }
};

const drawGraph = (links, nodes) => {
  const width = window.innerWidth || 420;
  const height = window.innerHeight || 420;
  const scale = d3.scaleOrdinal(d3.schemeCategory10);

  const dragstarted = d => {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  const dragged = d => {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  const dragended = d => {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  const drag = (simulation) => {

    const dragstarted = event => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    const dragged = event => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    const dragended = event => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  const color = d => scale(d.group);

  const svg = d3.select("svg")
      .attr("viewBox", [0, 0, width, height]);

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
          .id(d => d.id)
          .strength(link => link.rank / 10))
      .force("charge", d3.forceManyBody().strength(-20))
      .force("center", d3.forceCenter(width / 2, height / 2));

  const linkElements = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.rank));

  const textElements = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .enter().append('text')
      .text(node => node.label)
      .attr('font-size', 15)
      .attr('dx', 15)
      .attr('dy', 4)

  const nodeElements = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 5)
      .attr("fill", color)
      .call(drag(simulation));

  const ticked = () => {
    linkElements
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    nodeElements
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    textElements
      .attr('x', node => node.x)
      .attr('y', node => node.y);
  }

  simulation
    .nodes(nodes)
    .on("tick", ticked);
};

const generateNodes = matrix => {
  if (!matrix) {
    matrix = [];
  }

  const nodes = [];
  const seen = {};

  matrix.map(obj => {
    if (!(obj.source in seen)) {
      seen[obj.source] = true;
      nodes.push({
        id: obj.source,
        level: obj.level,
        group: obj.group,
      }); 
    }

    if (!(obj.target in seen)) {
      seen[obj.target] = true;
      nodes.push({
        id: obj.target,
        level: obj.level,
        group: obj.group,
      }); 
    }
  });

  return nodes;
};

const generateMatrix = async (term, comparator = 'vs', depth = 2) => {
  let matrix = [];
  
  const seen = {};
  const queue = [term, null];
  let level = 1;
  let group = 1;

  while (depth > 0) {
    while (queue.length > 0 && queue[0] !== null) {
      const query = `${queue.shift()} ${comparator}`; // ex: 'docker vs'
      const res = await getSuggestions(query);
      await sleep(100);
      const suggestions = get(res, 'toplevel.CompleteSuggestion', null);

      if (suggestions) {
        suggestions.forEach((s, idx) => {
          const suggestion = get(s, 'suggestion[0].$.data', null);
          process(suggestion, seen, queue, comparator, idx + 1, matrix, level, group);
        });

        group += 1;
      }
    }

    if (queue.length > 0 && queue[0] === null) queue.shift();
    queue.push(null);
    level += 1;
    depth--;
  }

  console.log(matrix);
  return matrix;
};

const generateGraph = async e => {
  e.preventDefault();

  const query = document.getElementById('search-query').value;
  const links = await generateMatrix(query);
  const nodes = generateNodes(links);

  console.log(query, links, nodes);
  drawGraph(links, nodes);

  return false;
};

generateMatrix('docker');
module.exports = {
  generateGraph,
}
