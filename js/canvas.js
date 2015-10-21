/**
 * Created by Alex on 9/13/2015.
 */

if(angular.isUndefined(rpg)) {
    var rpg = {
        $ng : angular.module('rpg', [])
    };
}

(function() {
    // <editor-fold desc="Utility Functions">
    var GRID_SEPARATION = 50;

    var REFRESH_RATE = 30;

    var TAU = Math.PI * 2;

    function innerGridOffset(x, y) {
        return {
            x : x % GRID_SEPARATION,
            y : y % GRID_SEPARATION
        }
    }

    function translateToGridCoords(x, y) {
        return {
            x : Math.floor(x / GRID_SEPARATION),
            y : Math.floor(y / GRID_SEPARATION)
        }
    }

    function roundedGridCoords(x, y) {
        return {
            x : Math.round(x / GRID_SEPARATION),
            y : Math.round(y / GRID_SEPARATION)
        }

    }

    function now() {
        return new Date().getTime() * 1000;
    }

    function clearLayer(target) {
        target.clearRect(0, 0, target.canvas.width, target.canvas.height);
    }

    function drawGrid(target) {
        target.lineWidth = 0.25;
        target.strokeStyle = '#000000';

        drawHorizontalGrid(target);
        drawVerticalGrid(target);
    }

    function drawHorizontalGrid(target) {
        for(var x = 0; x <= target.canvas.width; x += GRID_SEPARATION) {
            drawLine(target, x, 0, x, target.canvas.height, '#000000', 0.5);
        }
    }

    function drawVerticalGrid(target) {
        for(var y = 0; y <= target.canvas.height; y += GRID_SEPARATION) {
            drawLine(target, 0, y, target.canvas.width, y, '#000000', 0.5);
        }
    }

    function drawLine(target, x, y, nx, ny, color, width) {
        target.lineWidth = width;
        target.strokeStyle = color;

        target.beginPath();

        target.moveTo(x, y);
        target.lineTo(nx, ny);

        target.closePath();
        target.stroke();
    }

    function drawCircle(target, x, y, color, radius) {
        target.lineWidth = radius;
        target.strokeStyle = color;
        target.fillStyle = color;

        target.beginPath();

        target.arc(x, y, radius/2, 0, TAU);

        target.closePath();
        target.fill();
    }

    function drawImage(target, img, x, y) {
        target.drawImage(img, x-0.5, y-0.5, GRID_SEPARATION, GRID_SEPARATION);
    }
    // </editor-fold>

    var Token = function Token( imageName ) {
        var gridPos = { x:0,y:0 };
        var img = new Image;
        img.src = imageName;

        this.render = function(target) {
            drawImage(target, img, gridPos.x * GRID_SEPARATION, gridPos.y * GRID_SEPARATION);
        };

        this.renderInAir = function (target, x, y) {
            drawImage(target, img, x, y);
        };

        this.moveToGridPos = function(pos) {
            gridPos = pos;
        };

        this.moveToPos = function(x,y) {
            this.moveToGridPos(roundedGridCoords(x,y));
        };

        this.isAtGridPos = function(pos) {
            return pos && gridPos.x === pos.x && gridPos.y === pos.y;
        };

        this.isAtPos = function(x,y) {
            return this.isAtGridPos(translateToGridCoords(x,y));
        }
    };

    var DndGrid = function(ContextService, DispatcherService) {
        var container, isDown;

        var time = now();

        var prev = {
            x : 0,
            y : 0
        };

        return {
            controller : function($scope) {
                $scope.gridVisible = true;
                $scope.toggleGrid = function (show) {
                    if (show) {
                        DispatcherService.showGrid();
                    } else {
                        DispatcherService.hideGrid();
                    }
                };
                $scope.clearDrawing = DispatcherService.clearDrawing;
                $scope.updateDispatcher = DispatcherService.updateDispatcher;
                $scope.updateColor = DispatcherService.updateColor;
                $scope.updateWidth = DispatcherService.updateWidth;
            },
            restrict : 'E',
            templateUrl : 'partials/drawGrid.html',
            link : function(scope, element, attr) {
                container = element.children(0);

                ContextService.init(container);

                container.bind('mousedown', function(e){
                    isDown = true;

                    prev.x = e.offsetX;
                    prev.y = e.offsetY;

                    DispatcherService.handleMouseStart(prev.x, prev.y);
                });

                container.bind('mouseup mouseleave', function(e){
                    if(isDown) {
                        isDown = false;

                        DispatcherService.handleMouseEnd(prev.x, prev.y, e.offsetX, e.offsetY);
                    }
                });

                container.bind('mousemove', function(e) {
                    if(isDown && now() - time > 30) {
                        DispatcherService.handleMouseDrag(prev.x, prev.y, e.offsetX, e.offsetY);

                        prev.x = e.offsetX;
                        prev.y = e.offsetY;

                        time = now();
                    }
                });
            }
        };
    };

    var ContextService = function() {
        var drawCxt, gridCxt, toknCxt, initializers;

        initializers = [];

        return {
            init : function (container) {
                var gridLayer = container[0].getElementsByClassName('grid-layer')[0];
                gridCxt = gridLayer.getContext("2d");
                var drawLayer = container[0].getElementsByClassName('draw-layer')[0];
                drawCxt = drawLayer.getContext("2d");
                var toknLayer = container[0].getElementsByClassName('tokn-layer')[0];
                toknCxt = toknLayer.getContext("2d");

                initializers.forEach(function(initializer) {
                    initializer();
                });
             },

            registerInit: function(init) {
                initializers.push(init);
            },

            getGridContext : function() {
                return gridCxt;
            },

            getDrawContext : function() {
                return drawCxt;
            },

            getTokenContext : function() {
                return toknCxt;
            }
        }
    };

    var DrawingService = function(ContextService) {
        var eraseStart = { x:0,y:0 };
        var canvasDrawColor = '#0000F0';
        var canvasDrawWidth = 2;

        var erasureService = {
            handleMouseStart : function(x,y){
                eraseStart.x=x;
                eraseStart.y=y;
            },
            handleMouseDrag : function() {},
            handleMouseEnd : function(x,y,nx,ny) {
                ContextService.getDrawContext().clearRect(
                    eraseStart.x,
                    eraseStart.y,
                    nx - eraseStart.x,
                    ny - eraseStart.y
                );
            }
        };

        return {
            handleMouseStart : function(x,y) {
                drawCircle(ContextService.getDrawContext(), x, y, canvasDrawColor, canvasDrawWidth);
            },
            handleMouseDrag : function(x,y,nx,ny) {
                drawLine( ContextService.getDrawContext(), x, y, nx, ny, canvasDrawColor, canvasDrawWidth );
                drawCircle(ContextService.getDrawContext(), nx, ny, canvasDrawColor, canvasDrawWidth);
            },
            handleMouseEnd : function(x,y,nx,ny) {
                drawLine( ContextService.getDrawContext(), x, y, nx, ny, canvasDrawColor, canvasDrawWidth );
                drawCircle(ContextService.getDrawContext(), nx, ny, canvasDrawColor, canvasDrawWidth);
            },
            getErasureService : function() {
                return erasureService;
            },
            clear : function() {
                clearLayer( ContextService.getDrawContext() );
            },
            updateColor : function(color) {
                canvasDrawColor=color;
            },
            updateWidth : function(drawWidth) {
                canvasDrawWidth = drawWidth;
            }
        };
    };

    var GridService = function(ContextService) {
        ContextService.registerInit(function(){
            drawGrid( ContextService.getGridContext() )
        });

        return {
            showGrid : function() {
                drawGrid( ContextService.getGridContext() );
            },
            hideGrid : function() {
                clearLayer( ContextService.getGridContext() );
            }
        }
    };

    var TokenService = function(ContextService) {
        var tokens = [];
        var tokenInAir = null;
        var inAirOffset = null;
        var mousePos = { x:0,y:0 };
        var refreshUnlocked = true;

        var addToken = function(token) {
            tokens.push(token);
        };

        var renderAll = function() {
            if(refreshUnlocked) {
                refreshUnlocked = false;

                clearLayer(ContextService.getTokenContext());

                tokens.forEach(function (token) {
                    token.render(ContextService.getTokenContext());
                });

                if (tokenInAir != null) {
                    tokenInAir.renderInAir(
                        ContextService.getTokenContext(),
                        mousePos.x - inAirOffset.x,
                        mousePos.y - inAirOffset.y);
                }

                refreshUnlocked = true;
            }
        };

        var popTokenAtPos = function(x,y) {
            for( var i = tokens.length - 1;  i >= 0; i-- ) {
                if(tokens[i].isAtPos(x,y)) {
                    return tokens.splice(i,1)[0];
                }
            }

            return null;
        };

        var checkWidthBound = function(x) {
            var boundMax = ContextService.getTokenContext().canvas.width - GRID_SEPARATION/2;

            return x < 0 ? 0 : x >= boundMax ? boundMax - 1 : x;
        };

        var checkHeightBound = function(y) {
            var boundMax = ContextService.getTokenContext().canvas.height - GRID_SEPARATION/2;

            return y < 0 ? 0 : y >= boundMax ? boundMax - 1 : y;
        };

        window.setInterval(renderAll, REFRESH_RATE);

        ContextService.registerInit(function() {
            addToken(new Token("http://mephitjames.wdfiles.com/local--files/daacor-npcs/Kaeluur-Token.png"));
        });

        return {
            handleMouseStart : function(x,y) {
                if(tokenInAir == null) {
                    tokenInAir = popTokenAtPos(x, y);
                    inAirOffset = innerGridOffset(x, y);
                    mousePos.x = x;
                    mousePos.y = y;
                }
            },
            handleMouseDrag : function(x,y,nx,ny) {
                mousePos.x = nx;
                mousePos.y = ny;
            },
            handleMouseEnd : function(x,y) {
                if(tokenInAir != null) {
                    tokenInAir.moveToPos(checkWidthBound(x - inAirOffset.x), checkHeightBound(y - inAirOffset.y));
                    addToken(tokenInAir);

                    tokenInAir = null;
                }
            }
        };
    };

    var DispatcherService = function(DrawingService, GridService, TokenService) {
        var dispatch = {
            active : DrawingService,
            draw : DrawingService,
            grid : GridService,
            tokn : TokenService
        };

        return {
            showGrid : dispatch.grid.showGrid,
            hideGrid : dispatch.grid.hideGrid,
            handleMouseStart : function(x,y) {
                dispatch.active.handleMouseStart(x,y);
            },
            handleMouseDrag : function(x,y,nx,ny) {
                dispatch.active.handleMouseDrag(x,y,nx,ny);
            },
            handleMouseEnd : function(x,y,nx,ny) {
                dispatch.active.handleMouseEnd(x,y,nx,ny);
            },
            clearDrawing : dispatch.draw.clear,
            updateColor : dispatch.draw.updateColor,
            updateWidth : dispatch.draw.updateWidth,
            updateDispatcher : function(opt) {
                switch(opt.toLowerCase()) {
                    case "token" :
                        dispatch.active = dispatch.tokn;
                        break;
                    case "erasing" :
                        dispatch.active = dispatch.draw.getErasureService();
                        break;
                    case "drawing" :
                    default :
                        dispatch.active = dispatch.draw;
                        break;
                }
            }
        }
    };

    rpg.$ng.factory('ContextService', [ContextService]);
    rpg.$ng.factory('DrawingService', ['ContextService', DrawingService]);
    rpg.$ng.factory('GridService', ['ContextService', GridService]);
    rpg.$ng.factory('TokenService', ['ContextService', TokenService]);
    rpg.$ng.factory('DispatcherService', ['DrawingService', 'GridService', 'TokenService', DispatcherService]);

    rpg.$ng.directive('dndGrid', ['ContextService', 'DispatcherService', DndGrid]);
})();