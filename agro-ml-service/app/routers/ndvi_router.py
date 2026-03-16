from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/ndvi", tags=["NDVI / Satellite"])

_gee_initialized = False


class NdviRequest(BaseModel):
    coordinates: List[List[float]]
    date_start: str
    date_end: str
    max_cloud_pct: Optional[int] = 70
    scale: Optional[int] = 10


class NdviResponse(BaseModel):
    ndvi_mean:   Optional[float] = None
    ndvi_min:    Optional[float] = None
    ndvi_max:    Optional[float] = None
    ndvi_median: Optional[float] = None
    ndvi_std:    Optional[float] = None
    pixel_count: Optional[int]   = 0
    images_used: Optional[int]   = 0
    source: str = "GEE_SENTINEL2"
    error:  Optional[str] = None


class NdviImageRequest(BaseModel):
    coordinates: List[List[float]]
    date: str
    search_days:   Optional[int] = 15
    max_cloud_pct: Optional[int] = 70
    dimensions:    Optional[int] = 512


class NdviImageResponse(BaseModel):
    image_url:   Optional[str]       = None
    bbox:        Optional[List[float]] = None
    ndvi_mean:   Optional[float]     = None
    ndvi_min:    Optional[float]     = None
    ndvi_max:    Optional[float]     = None
    actual_date: Optional[str]       = None
    images_found: Optional[int]      = 0
    error:        Optional[str]      = None


class AvailableDatesRequest(BaseModel):
    coordinates: List[List[float]]
    date_start: str
    date_end: str
    max_cloud_pct: Optional[int] = 50


class AvailableDatesResponse(BaseModel):
    dates: List[str] = []
    error: Optional[str] = None


def _init_gee():
    global _gee_initialized
    if not _gee_initialized:
        from ndvi_gee import init_gee
        init_gee()
        _gee_initialized = True


@router.post("/satellite", response_model=NdviResponse,
             summary="Calculate mean NDVI for a polygon (Sentinel-2 MVC)")
def satellite_ndvi(req: NdviRequest):
    try:
        from ndvi_gee import calculate_ndvi_mvc
        _init_gee()
        result = calculate_ndvi_mvc(
            polygon_coords=req.coordinates,
            date_start=req.date_start,
            date_end=req.date_end,
            max_cloud_pct=req.max_cloud_pct or 70,
            scale=req.scale or 10,
        )
        return NdviResponse(source="GEE_SENTINEL2", **result)
    except Exception as e:
        return NdviResponse(error=str(e))


@router.post("/satellite-image", response_model=NdviImageResponse,
             summary="Get pixel-level NDVI map image URL for a polygon")
def satellite_ndvi_image(req: NdviImageRequest):
    try:
        from ndvi_gee import generate_ndvi_image
        _init_gee()
        result = generate_ndvi_image(
            polygon_coords=req.coordinates,
            date=req.date,
            search_days=req.search_days or 15,
            max_cloud_pct=req.max_cloud_pct or 70,
            dimensions=req.dimensions or 512,
        )
        return NdviImageResponse(**result)
    except Exception as e:
        return NdviImageResponse(error=str(e))


@router.post("/available-dates", response_model=AvailableDatesResponse,
             summary="List Sentinel-2 clear-sky dates for a polygon")
def available_dates(req: AvailableDatesRequest):
    try:
        from ndvi_gee import get_available_dates
        _init_gee()
        dates = get_available_dates(
            polygon_coords=req.coordinates,
            date_start=req.date_start,
            date_end=req.date_end,
            max_cloud_pct=req.max_cloud_pct or 50,
        )
        return AvailableDatesResponse(dates=dates)
    except Exception as e:
        return AvailableDatesResponse(error=str(e))


@router.get("/health", summary="Check GEE connectivity")
def health():
    try:
        from config import GEE_PROJECT
        _init_gee()
        return {"status": "ok", "gee": True, "project": GEE_PROJECT}
    except Exception as e:
        return {"status": "error", "gee": False, "detail": str(e)}
